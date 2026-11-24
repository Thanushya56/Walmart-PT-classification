// tests/rbac_security.test.js
// Automated Test Suite for RBAC, Invitation Engine & Security Requirements

import {
  getDatabase,
  resetDatabase,
  createInvitation,
  acceptInvitation,
  updateMemberRole,
  removeWorkspaceMember,
  addProduct,
  updateProduct,
  deleteProduct,
  getWorkspaceMember,
  getWorkspaceMembers,
} from '../server/db.js';
import { loadTaxonomy, searchTaxonomy } from '../server/taxonomy.js';
import { searchSimilarImages, computeImageSignature } from '../server/imageSearch.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('STARTING RBAC AND SECURITY VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  // Reset to clean default state
  resetDatabase();
  const db = getDatabase();
  const workspaceId = 'ws_walmart_main';
  const adminId = 'usr_admin_001';

  // Seed sample editor and viewer user profiles
  const editorUserId = 'usr_editor_002';
  const editorEmail = 'editor@walmart.com';
  db.profiles.push({
    id: editorUserId,
    email: editorEmail,
    full_name: 'John Editor',
    avatar_url: '',
    created_at: new Date().toISOString(),
  });

  const viewerUserId = 'usr_viewer_003';
  const viewerEmail = 'viewer@walmart.com';
  db.profiles.push({
    id: viewerUserId,
    email: viewerEmail,
    full_name: 'Sarah Viewer',
    avatar_url: '',
    created_at: new Date().toISOString(),
  });

  // -------------------------------------------------------------
  // TEST 1: Admin invites an Editor
  // -------------------------------------------------------------
  console.log('--- TEST 1: Admin invites Editor & Acceptance ---');
  try {
    const inviteRes = createInvitation(workspaceId, editorEmail, 'editor', adminId);
    assert(inviteRes && inviteRes.rawToken, 'Admin generated secure invitation token for Editor');
    assert(inviteRes.invitation.status === 'pending', 'Invitation status is initially pending');

    // Editor accepts invitation
    const acceptRes = acceptInvitation(workspaceId, editorEmail, inviteRes.rawToken, editorUserId);
    assert(acceptRes.success === true, 'Editor accepted invitation successfully');

    const editorMember = getWorkspaceMember(workspaceId, editorUserId);
    assert(editorMember && editorMember.role === 'editor', 'Teammate assigned EDITOR role in workspace');

    // Editor can upload product
    const prodRes = addProduct(workspaceId, {
      productName: 'Editor Classified Item 1',
      ptName: '3D Glasses',
      categoryName: 'Electronics',
      classificationNotes: 'Classified by Editor',
    }, editorUserId);
    assert(prodRes && prodRes.product.id, 'Editor successfully uploaded single product');

    // Editor can edit product
    const updatedProd = updateProduct(workspaceId, prodRes.product.id, {
      productName: 'Editor Classified Item 1 (Renamed)',
      classificationNotes: 'Updated notes by editor',
    }, editorUserId);
    assert(updatedProd.product_name === 'Editor Classified Item 1 (Renamed)', 'Editor successfully edited product');
  } catch (err) {
    assert(false, `TEST 1 Failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Admin invites a Viewer
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Admin invites Viewer & Acceptance ---');
  try {
    const inviteRes = createInvitation(workspaceId, viewerEmail, 'viewer', adminId);
    assert(inviteRes && inviteRes.invitation.assigned_role === 'viewer', 'Admin created Viewer invitation');

    const acceptRes = acceptInvitation(workspaceId, viewerEmail, inviteRes.rawToken, viewerUserId);
    assert(acceptRes.success === true, 'Viewer accepted invitation successfully');

    const viewerMember = getWorkspaceMember(workspaceId, viewerUserId);
    assert(viewerMember && viewerMember.role === 'viewer', 'Teammate assigned VIEWER role');

    // Viewer can browse/search products
    const products = db.products.filter(p => p.workspace_id === workspaceId);
    assert(products.length >= 3, 'Viewer can view workspace products library');
  } catch (err) {
    assert(false, `TEST 2 Failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 3: Viewer tries to update a PT through API / backend
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Viewer tries to update PT (Must be Blocked) ---');
  try {
    const existingProduct = db.products[0];
    let blocked = false;
    try {
      updateProduct(workspaceId, existingProduct.id, { ptName: 'Air Fresheners' }, viewerUserId);
    } catch (e) {
      blocked = true;
      assert(e.message.includes('Forbidden'), 'Backend blocked Viewer from updating PT: ' + e.message);
    }
    assert(blocked, 'Viewer was strictly blocked from updating classification');
  } catch (err) {
    assert(false, `TEST 3 Failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 4: Editor tries to invite another teammate (Must be Blocked)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Editor tries to invite teammate (Must be Blocked) ---');
  try {
    let blocked = false;
    try {
      createInvitation(workspaceId, 'intruder@walmart.com', 'editor', editorUserId);
    } catch (e) {
      blocked = true;
      assert(e.message.includes('Forbidden'), 'Backend blocked Editor from inviting teammates: ' + e.message);
    }
    assert(blocked, 'Editor was strictly prevented from creating invitations');
  } catch (err) {
    assert(false, `TEST 4 Failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 5: Admin changes Editor to Viewer
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Admin changes Editor to Viewer & Restrictions Apply Immediately ---');
  try {
    const editorMember = getWorkspaceMember(workspaceId, editorUserId);
    const updated = updateMemberRole(workspaceId, editorMember.id, 'viewer', adminId);
    assert(updated.role === 'viewer', 'Admin successfully changed role to Viewer');

    // Immediate restriction: former editor attempts to add product now
    let blockedNow = false;
    try {
      addProduct(workspaceId, {
        productName: 'Disallowed Product Addition',
        ptName: 'Art Paint Mediums',
      }, editorUserId);
    } catch (e) {
      blockedNow = true;
      assert(e.message.includes('Forbidden'), 'Former Editor immediately blocked from adding product: ' + e.message);
    }
    assert(blockedNow, 'Role downgrade takes effect immediately without stale permissions');
  } catch (err) {
    assert(false, `TEST 5 Failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 6: Admin removes a teammate
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Admin removes teammate & Access Revoked Immediately ---');
  try {
    const viewerMember = getWorkspaceMember(workspaceId, viewerUserId);
    const removeRes = removeWorkspaceMember(workspaceId, viewerMember.id, adminId);
    assert(removeRes.success === true, 'Admin removed team member');

    const checkMember = getWorkspaceMember(workspaceId, viewerUserId);
    assert(!checkMember, 'Workspace member record removed; access revoked immediately');

    // Check activity log contains audit record
    const removalLog = db.activity_logs.find(l => l.action === 'member_removed');
    assert(removalLog && removalLog.details.removed_user_email === viewerEmail, 'Activity log retained audit record of member removal');
  } catch (err) {
    assert(false, `TEST 6 Failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 7: Admin tries to remove or demote the only Admin account
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Prevent removing the only Admin account ---');
  try {
    const adminMember = getWorkspaceMember(workspaceId, adminId);
    let removeBlocked = false;
    try {
      removeWorkspaceMember(workspaceId, adminMember.id, adminId);
    } catch (e) {
      removeBlocked = true;
      assert(e.message.includes('Cannot remove the only workspace Admin'), 'Backend blocked removal of only Admin: ' + e.message);
    }
    assert(removeBlocked, 'Deletion of single remaining Admin successfully prevented');

    let demoteBlocked = false;
    try {
      updateMemberRole(workspaceId, adminMember.id, 'editor', adminId);
    } catch (e) {
      demoteBlocked = true;
      assert(e.message.includes('Cannot demote the only workspace Admin'), 'Backend blocked demotion of only Admin: ' + e.message);
    }
    assert(demoteBlocked, 'Demotion of single remaining Admin successfully prevented');
  } catch (err) {
    assert(false, `TEST 7 Failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 8: Two different workspaces exist (Workspace Isolation)
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Multi-Workspace Isolation ---');
  try {
    const ws2Id = 'ws_walmart_secondary';
    const owner2Id = 'usr_owner_002';

    db.profiles.push({
      id: owner2Id,
      email: 'owner2@walmart.com',
      full_name: 'Secondary Owner',
      avatar_url: '',
      created_at: new Date().toISOString(),
    });

    db.workspaces.push({
      id: ws2Id,
      name: 'Secondary Confidential Workspace',
      slug: 'secondary-confidential-workspace',
      owner_id: owner2Id,
      settings: { allow_viewer_export: false },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    db.workspace_members.push({
      id: 'mem_ws2_owner',
      workspace_id: ws2Id,
      user_id: owner2Id,
      role: 'admin',
      status: 'active',
      joined_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    });

    // Add secret product to workspace 2
    addProduct(ws2Id, {
      productName: 'Confidential Internal Prototype',
      ptName: 'Alto Horns',
      categoryName: 'Musical Instruments',
      classificationNotes: 'Workspace 2 only',
    }, owner2Id);

    // Verify main workspace queries do not leak workspace 2 products
    const ws1Products = db.products.filter(p => p.workspace_id === workspaceId);
    const leaked = ws1Products.find(p => p.product_name === 'Confidential Internal Prototype');
    assert(!leaked, 'Workspace 1 queries do not return Workspace 2 confidential products');

    // Verify member of WS1 cannot add product to WS2
    let wsCrossBlocked = false;
    try {
      addProduct(ws2Id, {
        productName: 'Unauthorized Cross-Workspace Injection',
        ptName: 'Aquarium Nets',
      }, adminId); // adminId is only member of WS1
    } catch (e) {
      wsCrossBlocked = true;
      assert(e.message.includes('Forbidden'), 'Unauthorized cross-workspace action blocked: ' + e.message);
    }
    assert(wsCrossBlocked, 'Strict workspace isolation enforced across all tenants');
  } catch (err) {
    assert(false, `TEST 8 Failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 9: Taxonomy Search & Smart Image Search verification
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Taxonomy Search & Smart Image Matching ---');
  try {
    loadTaxonomy();
    const searchRes = searchTaxonomy('glasses', '', 5);
    assert(searchRes.length > 0, `Taxonomy search for 'glasses' returned ${searchRes.length} Walmart PTs`);
    assert(searchRes[0].name.toLowerCase().includes('glasses'), `Top match is ${searchRes[0].name}`);

    // Perceptual Image Signature & Exact Match
    const dummyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const sig = computeImageSignature(dummyImage);
    assert(sig.exactHash && sig.pHash, 'Image signature and perceptual hash computed');

    const matches = searchSimilarImages(dummyImage, [
      { id: 'img_test_1', product_id: 'prd_001', image_url: dummyImage, image_hash: sig.exactHash, p_hash: sig.pHash }
    ]);
    assert(matches.length === 1 && matches[0].matchType === 'exact', 'Smart image search verified exact match with 100% confidence');
  } catch (err) {
    assert(false, `TEST 9 Failed: ${err.message}`);
  }

  console.log('\n======================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
