// server/db.js
// Streamlined Data Layer for Image + PT Classification & Creator Tracking

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { findPTByName } from './taxonomy.js';
import { computeImageSignature } from './imageSearch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'workspace_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db = {
  profiles: [],
  workspaces: [],
  workspace_members: [],
  workspace_invitations: [],
  pt_groups: [], // tracks { pt_name, created_by, created_by_name, created_at, category, path }
  classified_images: [], // tracks { id, workspace_id, image_url, pt_name, pt_key, category_name, pt_path, uploaded_by, uploaded_by_name, uploaded_at, image_hash, p_hash }
  activity_logs: [],
  // legacy compatibility
  products: [],
  product_images: [],
  classification_history: [],
};

export function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database file:', err);
  }
}

export function loadDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(content);
      if (!db.classified_images) db.classified_images = [];
      if (!db.pt_groups) db.pt_groups = [];
      return;
    } catch (e) {
      console.warn('Could not parse db file, initializing default state.');
    }
  }
  initializeDefaultState();
}

function initializeDefaultState() {
  const adminId = 'usr_admin_001';
  const workspaceId = 'ws_walmart_main';

  db = {
    profiles: [
      {
        id: adminId,
        email: 'admin@walmart.com',
        full_name: 'Workspace Owner (Admin)',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&fit=crop&crop=face',
        created_at: new Date().toISOString(),
      },
    ],
    workspaces: [
      {
        id: workspaceId,
        name: 'Walmart PT Classification Library',
        slug: 'walmart-pt-classification',
        owner_id: adminId,
        settings: {
          allow_viewer_export: false,
          invitation_expiry_days: 7,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    workspace_members: [
      {
        id: 'mem_admin_001',
        workspace_id: workspaceId,
        user_id: adminId,
        role: 'admin',
        status: 'active',
        joined_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      },
    ],
    workspace_invitations: [],
    pt_groups: [
      {
        pt_name: '3D Glasses',
        category: 'Electronics',
        pt_path: 'Electronics>TV & Video>3D Glasses',
        created_by: adminId,
        created_by_name: 'Workspace Owner (Admin)',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        pt_name: 'Adhesive Bandages',
        category: 'Health & Beauty',
        pt_path: 'Health & Beauty>Bandages & Bandaging Supplies>Adhesive Bandages',
        created_by: adminId,
        created_by_name: 'Workspace Owner (Admin)',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        pt_name: 'Air Fresheners',
        category: 'Home & Garden',
        pt_path: 'Home & Garden>Home Fragrance>Air Fresheners',
        created_by: adminId,
        created_by_name: 'Workspace Owner (Admin)',
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ],
    classified_images: [
      {
        id: 'img_001',
        workspace_id: workspaceId,
        image_url: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=600&auto=format&fit=crop&q=80',
        pt_name: '3D Glasses',
        pt_key: '3d glasses',
        category_name: 'Electronics',
        pt_path: 'Electronics>TV & Video>3D Glasses',
        uploaded_by: adminId,
        uploaded_by_name: 'Workspace Owner (Admin)',
        uploaded_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        image_hash: 'hash_sony_3d',
        p_hash: 'a1b2c3d4e5f60718',
      },
      {
        id: 'img_002',
        workspace_id: workspaceId,
        image_url: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&auto=format&fit=crop&q=80',
        pt_name: 'Adhesive Bandages',
        pt_key: 'adhesive bandages',
        category_name: 'Health & Beauty',
        pt_path: 'Health & Beauty>Bandages & Bandaging Supplies>Adhesive Bandages',
        uploaded_by: adminId,
        uploaded_by_name: 'Workspace Owner (Admin)',
        uploaded_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        image_hash: 'hash_bandaid_100',
        p_hash: '18273645e5f60718',
      },
      {
        id: 'img_003',
        workspace_id: workspaceId,
        image_url: 'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=600&auto=format&fit=crop&q=80',
        pt_name: 'Air Fresheners',
        pt_key: 'air fresheners',
        category_name: 'Home & Garden',
        pt_path: 'Home & Garden>Home Fragrance>Air Fresheners',
        uploaded_by: adminId,
        uploaded_by_name: 'Workspace Owner (Admin)',
        uploaded_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        image_hash: 'hash_glade_hawaii',
        p_hash: '5544332211009988',
      },
    ],
    activity_logs: [
      {
        id: 'act_001',
        workspace_id: workspaceId,
        actor_id: adminId,
        actor_name: 'Workspace Owner (Admin)',
        actor_email: 'admin@walmart.com',
        action: 'workspace_initialized',
        entity_type: 'workspace',
        entity_id: workspaceId,
        details: { name: 'Walmart PT Classification Library' },
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'act_002',
        workspace_id: workspaceId,
        actor_id: adminId,
        actor_name: 'Workspace Owner (Admin)',
        actor_email: 'admin@walmart.com',
        action: 'image_uploaded',
        entity_type: 'image',
        entity_id: 'img_001',
        details: { pt_name: '3D Glasses' },
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
    // keep legacy objects for compatibility with existing tests
    products: [
      {
        id: 'prd_img_001',
        workspace_id: workspaceId,
        product_name: '3D Glasses',
        pt_name: '3D Glasses',
        category_name: 'Electronics',
        status: 'classified',
        created_by: adminId,
        updated_by: adminId,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'prd_img_002',
        workspace_id: workspaceId,
        product_name: 'Adhesive Bandages',
        pt_name: 'Adhesive Bandages',
        category_name: 'Health & Beauty',
        status: 'classified',
        created_by: adminId,
        updated_by: adminId,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'prd_img_003',
        workspace_id: workspaceId,
        product_name: 'Air Fresheners',
        pt_name: 'Air Fresheners',
        category_name: 'Home & Garden',
        status: 'classified',
        created_by: adminId,
        updated_by: adminId,
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ],
    product_images: [],
    classification_history: [],
  };

  saveDatabase();
}

loadDatabase();

export function getDatabase() {
  return db;
}

export function resetDatabase() {
  initializeDefaultState();
  return db;
}

export function getWorkspace(workspaceId) {
  return db.workspaces.find(w => w.id === workspaceId);
}

export function getUserProfile(userId) {
  return db.profiles.find(p => p.id === userId);
}

export function getUserProfileByEmail(email) {
  if (!email) return null;
  return db.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
}

export function getWorkspaceMember(workspaceId, userId) {
  return db.workspace_members.find(
    m => m.workspace_id === workspaceId && m.user_id === userId && m.status === 'active'
  );
}

export function getWorkspaceMembers(workspaceId) {
  return db.workspace_members
    .filter(m => m.workspace_id === workspaceId)
    .map(m => {
      const profile = getUserProfile(m.user_id) || { full_name: 'Unknown', email: 'unknown@example.com', avatar_url: '' };
      return {
        ...m,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
      };
    });
}

// -------------------------------------------------------------
// STREAMLINED IMAGE + PT CLASSIFICATION
// -------------------------------------------------------------

export function addImageClassification(workspaceId, { image, ptName }, actorUserId) {
  const actorMember = getWorkspaceMember(workspaceId, actorUserId);
  if (!actorMember || (actorMember.role !== 'admin' && actorMember.role !== 'editor')) {
    throw new Error('Forbidden: Viewers are not permitted to upload images or assign PTs.');
  }

  if (!image) {
    throw new Error('Product image is required (upload or Ctrl+V paste).');
  }

  if (!ptName || !ptName.trim()) {
    throw new Error('Walmart Product Type (PT) is required.');
  }

  const cleanPtName = ptName.trim();
  const actorProfile = getUserProfile(actorUserId);
  const actorName = actorProfile?.full_name || actorProfile?.email || 'Team Member';

  // Lookup PT details in official taxonomy
  const ptDef = findPTByName(cleanPtName);
  const categoryName = ptDef?.category || 'General';
  const ptPath = ptDef?.path || cleanPtName;

  // Track or create PT group and record original creator
  let group = db.pt_groups.find(
    g => g.pt_name.toLowerCase() === cleanPtName.toLowerCase()
  );

  if (!group) {
    group = {
      pt_name: cleanPtName,
      category: categoryName,
      pt_path: ptPath,
      created_by: actorUserId,
      created_by_name: actorName,
      created_at: new Date().toISOString(),
    };
    db.pt_groups.push(group);

    addActivityLog(workspaceId, actorUserId, actorName, actorProfile?.email, 'pt_group_created', 'pt_group', cleanPtName, {
      pt_name: cleanPtName,
      category: categoryName,
    });
  }

  // Extract signature for exact & perceptual visual matching
  const sig = computeImageSignature(image);
  const imageId = 'img_' + crypto.randomUUID();

  const newImage = {
    id: imageId,
    workspace_id: workspaceId,
    image_url: image,
    pt_name: cleanPtName,
    pt_key: cleanPtName.toLowerCase(),
    category_name: categoryName,
    pt_path: ptPath,
    uploaded_by: actorUserId,
    uploaded_by_name: actorName,
    uploaded_at: new Date().toISOString(),
    image_hash: sig.exactHash,
    p_hash: sig.pHash,
  };

  db.classified_images.unshift(newImage);

  // Sync to legacy products for backward compatibility
  db.products.unshift({
    id: 'prd_' + imageId,
    workspace_id: workspaceId,
    product_name: cleanPtName,
    pt_name: cleanPtName,
    category_name: categoryName,
    status: 'classified',
    created_by: actorUserId,
    updated_by: actorUserId,
    created_at: newImage.uploaded_at,
    updated_at: newImage.uploaded_at,
    images: [{ image_url: image, image_hash: sig.exactHash }],
  });

  // Audit log
  addActivityLog(workspaceId, actorUserId, actorName, actorProfile?.email, 'image_uploaded', 'image', imageId, {
    pt_name: cleanPtName,
    category: categoryName,
  });

  saveDatabase();
  return { success: true, image: newImage, group };
}

// Bulk upload for image + PT pairs
export function bulkAddImageClassifications(workspaceId, items, actorUserId) {
  const actorMember = getWorkspaceMember(workspaceId, actorUserId);
  if (!actorMember || (actorMember.role !== 'admin' && actorMember.role !== 'editor')) {
    throw new Error('Forbidden: Viewers are not permitted to upload images.');
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const res = addImageClassification(workspaceId, items[i], actorUserId);
      results.push(res.image);
    } catch (err) {
      errors.push({ index: i, error: err.message });
    }
  }

  return {
    total: items.length,
    successCount: results.length,
    failedCount: errors.length,
    images: results,
    errors,
  };
}

// Update PT for an image
export function updateImagePt(workspaceId, imageId, newPtName, actorUserId) {
  const actorMember = getWorkspaceMember(workspaceId, actorUserId);
  if (!actorMember || (actorMember.role !== 'admin' && actorMember.role !== 'editor')) {
    throw new Error('Forbidden: Viewers cannot change PT classifications.');
  }

  const img = db.classified_images.find(i => i.id === imageId && i.workspace_id === workspaceId);
  if (!img) {
    throw new Error('Image not found.');
  }

  const actorProfile = getUserProfile(actorUserId);
  const oldPt = img.pt_name;
  const cleanPt = newPtName.trim();
  const ptDef = findPTByName(cleanPt);

  img.pt_name = cleanPt;
  img.pt_key = cleanPt.toLowerCase();
  img.category_name = ptDef?.category || img.category_name;
  img.pt_path = ptDef?.path || cleanPt;

  // Track PT Group if new
  let group = db.pt_groups.find(g => g.pt_name.toLowerCase() === cleanPt.toLowerCase());
  if (!group) {
    db.pt_groups.push({
      pt_name: cleanPt,
      category: img.category_name,
      pt_path: img.pt_path,
      created_by: actorUserId,
      created_by_name: actorProfile?.full_name || 'Team Member',
      created_at: new Date().toISOString(),
    });
  }

  addActivityLog(workspaceId, actorUserId, actorProfile?.full_name || 'Team Member', actorProfile?.email, 'pt_changed', 'image', imageId, {
    previous_pt: oldPt,
    new_pt: cleanPt,
  });

  saveDatabase();
  return img;
}

// Delete Image (ADMIN ONLY)
export function deleteClassifiedImage(workspaceId, imageId, actorUserId) {
  const actorMember = getWorkspaceMember(workspaceId, actorUserId);
  if (!actorMember || actorMember.role !== 'admin') {
    throw new Error('Forbidden: Only workspace Admins can delete images or PT records.');
  }

  const idx = db.classified_images.findIndex(i => i.id === imageId && i.workspace_id === workspaceId);
  if (idx === -1) {
    throw new Error('Image not found.');
  }

  const target = db.classified_images[idx];
  db.classified_images.splice(idx, 1);

  // Clean legacy product references
  db.products = db.products.filter(p => p.id !== 'prd_' + imageId);

  const actorProfile = getUserProfile(actorUserId);
  addActivityLog(workspaceId, actorUserId, actorProfile?.full_name || 'Admin', actorProfile?.email, 'image_deleted', 'image', imageId, {
    pt_name: target.pt_name,
  });

  saveDatabase();
  return { success: true, deletedImageId: imageId };
}

// Get PT Groups with Creator Tracking & Image counts
export function getPtGroupsWithImages(workspaceId) {
  const images = db.classified_images.filter(i => i.workspace_id === workspaceId);
  const groupsMap = new Map();

  for (const img of images) {
    const pt = img.pt_name;
    if (!groupsMap.has(pt)) {
      const existingGroup = db.pt_groups.find(g => g.pt_name.toLowerCase() === pt.toLowerCase());
      groupsMap.set(pt, {
        pt_name: pt,
        category: img.category_name,
        pt_path: img.pt_path,
        created_by: existingGroup?.created_by || img.uploaded_by,
        created_by_name: existingGroup?.created_by_name || img.uploaded_by_name,
        created_at: existingGroup?.created_at || img.uploaded_at,
        images: [],
      });
    }
    groupsMap.get(pt).images.push(img);
  }

  return Array.from(groupsMap.values()).map(g => ({
    ...g,
    imageCount: g.images.length,
    sampleImages: g.images.slice(0, 8),
  }));
}

// -------------------------------------------------------------
// MEMBER & INVITATION RBAC
// -------------------------------------------------------------

export function updateMemberRole(workspaceId, memberId, newRole, actorUserId) {
  const actorMember = getWorkspaceMember(workspaceId, actorUserId);
  if (!actorMember || actorMember.role !== 'admin') {
    throw new Error('Forbidden: Only workspace Admins can change member roles.');
  }

  const targetMember = db.workspace_members.find(m => m.id === memberId && m.workspace_id === workspaceId);
  if (!targetMember) throw new Error('Member not found in this workspace.');
  if (!['admin', 'editor', 'viewer'].includes(newRole)) throw new Error('Invalid role specified.');

  // Prevent demoting the last admin
  if (targetMember.role === 'admin' && newRole !== 'admin') {
    const activeAdmins = db.workspace_members.filter(
      m => m.workspace_id === workspaceId && m.role === 'admin' && m.status === 'active'
    );
    if (activeAdmins.length <= 1) {
      throw new Error('Action blocked: Cannot demote the only workspace Admin. Assign another Admin first.');
    }
  }

  const oldRole = targetMember.role;
  targetMember.role = newRole;
  targetMember.last_active_at = new Date().toISOString();

  const actorProfile = getUserProfile(actorUserId);
  const targetProfile = getUserProfile(targetMember.user_id);
  addActivityLog(workspaceId, actorUserId, actorProfile?.full_name || 'Admin', actorProfile?.email, 'role_changed', 'member', memberId, {
    target_email: targetProfile?.email,
    previous_role: oldRole,
    new_role: newRole,
  });

  saveDatabase();
  return targetMember;
}

export function removeWorkspaceMember(workspaceId, memberId, actorUserId) {
  const actorMember = getWorkspaceMember(workspaceId, actorUserId);
  if (!actorMember || actorMember.role !== 'admin') {
    throw new Error('Forbidden: Only workspace Admins can remove team members.');
  }

  const targetMemberIdx = db.workspace_members.findIndex(m => m.id === memberId && m.workspace_id === workspaceId);
  if (targetMemberIdx === -1) throw new Error('Member not found in this workspace.');

  const targetMember = db.workspace_members[targetMemberIdx];

  // Prevent removing the last admin
  if (targetMember.role === 'admin') {
    const activeAdmins = db.workspace_members.filter(
      m => m.workspace_id === workspaceId && m.role === 'admin' && m.status === 'active'
    );
    if (activeAdmins.length <= 1) {
      throw new Error('Action blocked: Cannot remove the only workspace Admin.');
    }
  }

  const targetProfile = getUserProfile(targetMember.user_id);
  db.workspace_members.splice(targetMemberIdx, 1);

  const actorProfile = getUserProfile(actorUserId);
  addActivityLog(workspaceId, actorUserId, actorProfile?.full_name || 'Admin', actorProfile?.email, 'member_removed', 'member', memberId, {
    removed_user_email: targetProfile?.email,
    previous_role: targetMember.role,
  });

  saveDatabase();
  return { success: true, removedMemberId: memberId };
}

export function createInvitation(workspaceId, email, role, actorUserId) {
  const actorMember = getWorkspaceMember(workspaceId, actorUserId);
  if (!actorMember || actorMember.role !== 'admin') {
    throw new Error('Forbidden: Only workspace Admins can send invitations.');
  }

  if (!email || !role) throw new Error('Email and role are required.');

  const cleanEmail = email.toLowerCase().trim();
  const cleanRole = role.toLowerCase().trim();

  if (!['editor', 'viewer'].includes(cleanRole)) {
    throw new Error('Role must be either Editor or Viewer.');
  }

  const existingProfile = getUserProfileByEmail(cleanEmail);
  if (existingProfile) {
    const isMember = getWorkspaceMember(workspaceId, existingProfile.id);
    if (isMember) {
      throw new Error(`User with email ${cleanEmail} is already a member with role '${isMember.role}'.`);
    }
  }

  db.workspace_invitations.forEach(inv => {
    if (inv.workspace_id === workspaceId && inv.email === cleanEmail && inv.status === 'pending') {
      inv.status = 'cancelled';
    }
  });

  const rawToken = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const invitation = {
    id: 'inv_' + crypto.randomUUID(),
    workspace_id: workspaceId,
    email: cleanEmail,
    assigned_role: cleanRole,
    invitation_token_hash: tokenHash,
    raw_token: rawToken,
    invited_by: actorUserId,
    expires_at: expiresAt,
    accepted_at: null,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  db.workspace_invitations.push(invitation);

  const actorProfile = getUserProfile(actorUserId);
  addActivityLog(workspaceId, actorUserId, actorProfile?.full_name || 'Admin', actorProfile?.email, 'member_invited', 'invitation', invitation.id, {
    recipient_email: cleanEmail,
    assigned_role: cleanRole,
    expires_at: expiresAt,
  });

  saveDatabase();

  return {
    invitation,
    rawToken,
    inviteLink: `/accept-invitation?token=${rawToken}&email=${encodeURIComponent(cleanEmail)}&workspaceId=${workspaceId}`,
  };
}

export function verifyInvitationToken(workspaceId, email, rawToken) {
  if (!rawToken || !email || !workspaceId) return null;
  const cleanEmail = email.toLowerCase().trim();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const invitation = db.workspace_invitations.find(
    inv => inv.workspace_id === workspaceId &&
           inv.email === cleanEmail &&
           (inv.invitation_token_hash === tokenHash || inv.raw_token === rawToken || inv.invitation_token_hash === rawToken) &&
           inv.status === 'pending'
  );
  if (!invitation) return null;
  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    invitation.status = 'expired';
    saveDatabase();
    return null;
  }
  return invitation;
}

export function acceptInvitation(workspaceId, email, rawToken, userId, profileData = {}) {
  if (!rawToken || !email || !workspaceId) {
    throw new Error('Missing required invitation acceptance parameters.');
  }

  const cleanEmail = email.toLowerCase().trim();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const invitation = db.workspace_invitations.find(
    inv => inv.workspace_id === workspaceId &&
           inv.email === cleanEmail &&
           (inv.invitation_token_hash === tokenHash || inv.raw_token === rawToken || inv.invitation_token_hash === rawToken) &&
           inv.status === 'pending'
  );

  if (!invitation) throw new Error('Invalid or already accepted invitation.');

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    invitation.status = 'expired';
    saveDatabase();
    throw new Error('This invitation has expired. Please contact your workspace Admin.');
  }

  // Resolve or create user profile for this teammate
  let user = userId ? getUserProfile(userId) : null;
  if (!user || user.email.toLowerCase() !== cleanEmail) {
    user = getUserProfileByEmail(cleanEmail);
    if (!user) {
      const newUserId = 'usr_' + crypto.randomUUID();
      const defaultName = profileData.full_name || profileData.fullName || cleanEmail.split('@')[0];
      const avatarUrl = profileData.avatar_url || profileData.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(defaultName)}`;
      user = {
        id: newUserId,
        email: cleanEmail,
        full_name: defaultName,
        avatar_url: avatarUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.profiles.push(user);
    }
  }

  let member = db.workspace_members.find(m => m.workspace_id === workspaceId && m.user_id === user.id);
  if (member) {
    member.role = invitation.assigned_role;
    member.status = 'active';
    member.last_active_at = new Date().toISOString();
  } else {
    member = {
      id: 'mem_' + crypto.randomUUID(),
      workspace_id: workspaceId,
      user_id: user.id,
      role: invitation.assigned_role,
      status: 'active',
      joined_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    };
    db.workspace_members.push(member);
  }

  invitation.status = 'accepted';
  invitation.accepted_at = new Date().toISOString();

  addActivityLog(workspaceId, user.id, user.full_name, user.email, 'invitation_accepted', 'member', member.id, {
    assigned_role: invitation.assigned_role,
  });

  saveDatabase();
  return { success: true, member, user, role: member.role, workspace: getWorkspace(workspaceId) };
}

export function cancelInvitation(workspaceId, invitationId, actorUserId) {
  const actorMember = getWorkspaceMember(workspaceId, actorUserId);
  if (!actorMember || actorMember.role !== 'admin') {
    throw new Error('Forbidden: Only workspace Admins can cancel invitations.');
  }

  const invitation = db.workspace_invitations.find(inv => inv.id === invitationId && inv.workspace_id === workspaceId);
  if (!invitation) throw new Error('Invitation not found.');

  invitation.status = 'cancelled';
  const actorProfile = getUserProfile(actorUserId);
  addActivityLog(workspaceId, actorUserId, actorProfile?.full_name || 'Admin', actorProfile?.email, 'invitation_cancelled', 'invitation', invitationId, {
    cancelled_email: invitation.email,
  });

  saveDatabase();
  return { success: true, invitation };
}

export function resendInvitation(workspaceId, invitationId, actorUserId) {
  const actorMember = getWorkspaceMember(workspaceId, actorUserId);
  if (!actorMember || actorMember.role !== 'admin') {
    throw new Error('Forbidden: Only workspace Admins can resend invitations.');
  }

  const invitation = db.workspace_invitations.find(inv => inv.id === invitationId && inv.workspace_id === workspaceId);
  if (!invitation) throw new Error('Invitation not found.');

  const rawToken = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  invitation.invitation_token_hash = tokenHash;
  invitation.raw_token = rawToken;
  invitation.expires_at = expiresAt;
  invitation.status = 'pending';

  const actorProfile = getUserProfile(actorUserId);
  addActivityLog(workspaceId, actorUserId, actorProfile?.full_name || 'Admin', actorProfile?.email, 'invitation_resent', 'invitation', invitationId, {
    recipient_email: invitation.email,
  });

  saveDatabase();

  return {
    success: true,
    invitation,
    rawToken,
    inviteLink: `/accept-invitation?token=${rawToken}&email=${encodeURIComponent(invitation.email)}&workspaceId=${workspaceId}`,
  };
}

// Delete entire PT Group (ADMIN ONLY)
export function deletePtGroup(workspaceId, ptName, actorUserId) {
  const actorMember = getWorkspaceMember(workspaceId, actorUserId);
  if (!actorMember || actorMember.role !== 'admin') {
    throw new Error('Forbidden: Only workspace Admins can delete PT groups.');
  }

  const cleanPt = ptName.trim();
  // Delete all images in this PT group
  const removedImages = db.classified_images.filter(
    i => i.workspace_id === workspaceId && i.pt_name.toLowerCase() === cleanPt.toLowerCase()
  );
  db.classified_images = db.classified_images.filter(
    i => !(i.workspace_id === workspaceId && i.pt_name.toLowerCase() === cleanPt.toLowerCase())
  );
  db.products = db.products.filter(
    p => !(p.workspace_id === workspaceId && p.pt_name.toLowerCase() === cleanPt.toLowerCase())
  );

  // Remove from pt_groups
  db.pt_groups = db.pt_groups.filter(
    g => g.pt_name.toLowerCase() !== cleanPt.toLowerCase()
  );

  const actorProfile = getUserProfile(actorUserId);
  addActivityLog(workspaceId, actorUserId, actorProfile?.full_name || 'Admin', actorProfile?.email, 'pt_group_deleted', 'pt_group', cleanPt, {
    pt_name: cleanPt,
    deleted_images_count: removedImages.length,
  });

  saveDatabase();
  return { success: true, deletedPt: cleanPt, count: removedImages.length };
}

// Rename entire PT Group (ADMIN OR EDITOR)
export function renamePtGroup(workspaceId, oldPtName, newPtName, actorUserId) {
  const actorMember = getWorkspaceMember(workspaceId, actorUserId);
  if (!actorMember || (actorMember.role !== 'admin' && actorMember.role !== 'editor')) {
    throw new Error('Forbidden: Viewers cannot rename PT groups.');
  }

  const oldClean = oldPtName.trim();
  const newClean = newPtName.trim();
  const ptDef = findPTByName(newClean);

  let updatedCount = 0;
  for (const img of db.classified_images) {
    if (img.workspace_id === workspaceId && img.pt_name.toLowerCase() === oldClean.toLowerCase()) {
      img.pt_name = newClean;
      img.pt_key = newClean.toLowerCase();
      if (ptDef?.category) img.category_name = ptDef.category;
      if (ptDef?.path) img.pt_path = ptDef.path;
      updatedCount++;
    }
  }

  for (const p of db.products) {
    if (p.workspace_id === workspaceId && p.pt_name.toLowerCase() === oldClean.toLowerCase()) {
      p.pt_name = newClean;
    }
  }

  // Update pt_groups record
  const g = db.pt_groups.find(x => x.pt_name.toLowerCase() === oldClean.toLowerCase());
  if (g) {
    g.pt_name = newClean;
    if (ptDef?.category) g.category = ptDef.category;
    if (ptDef?.path) g.pt_path = ptDef.path;
  }

  const actorProfile = getUserProfile(actorUserId);
  addActivityLog(workspaceId, actorUserId, actorProfile?.full_name || 'Team Member', actorProfile?.email, 'pt_group_renamed', 'pt_group', newClean, {
    previous_pt: oldClean,
    new_pt: newClean,
    affected_images: updatedCount,
  });

  saveDatabase();
  return { success: true, previousPt: oldClean, newPt: newClean, count: updatedCount };
}

// Update Profile
export function updateUserProfile(userId, { full_name, email, avatar_url }) {
  let profile = db.profiles.find(p => p.id === userId);
  if (!profile) {
    profile = { id: userId, email: email || 'user@gmail.com', full_name: full_name || 'User', avatar_url: avatar_url || '' };
    db.profiles.push(profile);
  }

  if (full_name) profile.full_name = full_name.trim();
  if (email) profile.email = email.toLowerCase().trim();
  if (avatar_url !== undefined) profile.avatar_url = avatar_url;
  profile.updated_at = new Date().toISOString();

  // If this user uploaded images or created groups, update their displayed name
  for (const img of db.classified_images) {
    if (img.uploaded_by === userId) {
      img.uploaded_by_name = profile.full_name;
    }
  }
  for (const g of db.pt_groups) {
    if (g.created_by === userId) {
      g.created_by_name = profile.full_name;
    }
  }

  saveDatabase();
  return profile;
}

// Login or Switch with Gmail
export function loginWithGmail(email, full_name, avatar_url) {
  const cleanEmail = email.toLowerCase().trim();
  let profile = db.profiles.find(p => p.email.toLowerCase() === cleanEmail);

  if (!profile) {
    profile = {
      id: 'usr_' + crypto.randomUUID().slice(0, 8),
      email: cleanEmail,
      full_name: full_name || cleanEmail.split('@')[0],
      avatar_url: avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
      created_at: new Date().toISOString(),
    };
    db.profiles.push(profile);
  } else {
    if (full_name) profile.full_name = full_name;
    if (avatar_url) profile.avatar_url = avatar_url;
  }

  const workspaceId = 'ws_walmart_main';
  let member = db.workspace_members.find(m => m.workspace_id === workspaceId && m.user_id === profile.id);

  if (!member) {
    // If the workspace has only the default admin or none, let this Gmail user assume/become Admin
    const activeAdmins = db.workspace_members.filter(m => m.workspace_id === workspaceId && m.role === 'admin');
    const role = (activeAdmins.length === 0 || activeAdmins.some(a => a.user_id === 'usr_admin_001')) ? 'admin' : 'editor';

    // If making this user Admin and previous was usr_admin_001, update owner
    if (role === 'admin') {
      const ws = getWorkspace(workspaceId);
      if (ws) ws.owner_id = profile.id;
    }

    member = {
      id: 'mem_' + crypto.randomUUID().slice(0, 8),
      workspace_id: workspaceId,
      user_id: profile.id,
      role: role,
      status: 'active',
      joined_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    };
    db.workspace_members.push(member);
  } else {
    member.last_active_at = new Date().toISOString();
  }

  saveDatabase();
  return {
    success: true,
    user: profile,
    role: member.role,
    workspace: getWorkspace(workspaceId),
  };
}

// Activity Log Helper
export function addActivityLog(workspaceId, actorId, actorName, actorEmail, action, entityType, entityId, details = {}) {
  const log = {
    id: 'act_' + crypto.randomUUID(),
    workspace_id: workspaceId,
    actor_id: actorId,
    actor_name: actorName,
    actor_email: actorEmail,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    created_at: new Date().toISOString(),
  };
  db.activity_logs.unshift(log);
  if (db.activity_logs.length > 1000) db.activity_logs.pop();
}

// Backward-compatible stubs for tests
export function addProduct(workspaceId, productData, actorUserId) {
  const res = addImageClassification(workspaceId, {
    image: productData.images?.[0]?.url || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    ptName: productData.ptName,
  }, actorUserId);
  return {
    product: {
      id: res.image.id,
      product_name: productData.productName || res.image.pt_name,
      pt_name: res.image.pt_name,
    },
  };
}

export function updateProduct(workspaceId, productId, updateData, actorUserId) {
  const res = updateImagePt(workspaceId, productId, updateData.ptName || 'Updated PT', actorUserId);
  return {
    id: res.id,
    product_name: updateData.productName || res.pt_name,
    pt_name: res.pt_name,
  };
}

export function deleteProduct(workspaceId, productId, actorUserId) {
  return deleteClassifiedImage(workspaceId, productId, actorUserId);
}
