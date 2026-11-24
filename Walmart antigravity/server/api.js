// server/api.js
// REST API Server with Role-Based Permission Enforcement & Static Asset Server

import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  getDatabase,
  getWorkspace,
  getUserProfile,
  getWorkspaceMember,
  getWorkspaceMembers,
  updateMemberRole,
  removeWorkspaceMember,
  createInvitation,
  acceptInvitation,
  cancelInvitation,
  resendInvitation,
  verifyInvitationToken,
  addImageClassification,
  bulkAddImageClassifications,
  updateImagePt,
  deleteClassifiedImage,
  deletePtGroup,
  renamePtGroup,
  updateUserProfile,
  loginWithGmail,
  getPtGroupsWithImages,
  saveDatabase,
} from './db.js';
import { searchTaxonomy, getCategories, findPTByName } from './taxonomy.js';
import { searchSimilarImages } from './imageSearch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) {
        reject(new Error('Request entity too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-Workspace-Id',
  });
  res.end(JSON.stringify(data));
}

function getRequestContext(req) {
  const userId = req.headers['x-user-id'] || 'usr_admin_001';
  const workspaceId = req.headers['x-workspace-id'] || 'ws_walmart_main';

  const member = getWorkspaceMember(workspaceId, userId);
  const user = getUserProfile(userId);

  return {
    userId,
    workspaceId,
    user,
    member,
    role: member?.role || (userId === 'usr_admin_001' ? 'admin' : null),
  };
}

export function handleApiRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-Workspace-Id',
    });
    return res.end();
  }

  if (pathname.startsWith('/api')) {
    return route(req, res, pathname, method, parsedUrl.query).catch(err => {
      console.error('API Error:', err);
      sendJson(res, err.statusCode || 500, { error: err.message || 'Internal server error' });
    });
  }

  serveStatic(req, res, pathname);
}

function serveStatic(req, res, pathname) {
  if (!fs.existsSync(DIST_DIR)) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('Walmart PT Classification Library Backend API running.');
  }

  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

async function route(req, res, path, method, query) {
  const ctx = getRequestContext(req);
  const db = getDatabase();

  // -------------------------------------------------------------
  // 1. SESSION & CONTEXT
  // -------------------------------------------------------------
  if (path === '/api/auth/me' && method === 'GET') {
    const user = ctx.user || { id: ctx.userId, email: 'admin@walmart.com', full_name: 'Workspace Owner' };
    const member = ctx.member || { role: ctx.role || 'admin', status: 'active' };
    const ws = getWorkspace(ctx.workspaceId);
    return sendJson(res, 200, {
      user,
      workspace: ws,
      role: member.role,
    });
  }

  // Login with Gmail
  if (path === '/api/auth/login-gmail' && method === 'POST') {
    const body = await parseBody(req);
    try {
      const result = loginWithGmail(body.email, body.full_name, body.avatar_url);
      return sendJson(res, 200, result);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // Update profile (Full name, email, avatar)
  if (path === '/api/auth/profile' && method === 'PUT') {
    const body = await parseBody(req);
    try {
      const updated = updateUserProfile(ctx.userId, body);
      return sendJson(res, 200, { success: true, user: updated });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  if (path === '/api/auth/switch' && method === 'POST') {
    const body = await parseBody(req);
    const targetUserId = body.userId;
    const user = getUserProfile(targetUserId);
    if (!user) return sendJson(res, 404, { error: 'User not found' });
    const member = getWorkspaceMember(ctx.workspaceId, targetUserId);
    return sendJson(res, 200, {
      success: true,
      user,
      role: member?.role || 'none',
    });
  }

  // -------------------------------------------------------------
  // 2. SIMPLE UPLOAD (IMAGE + WALMART PT ONLY)
  // -------------------------------------------------------------
  if ((path === '/api/upload' || path === '/api/products') && method === 'POST') {
    if (ctx.role !== 'admin' && ctx.role !== 'editor') {
      return sendJson(res, 403, { error: 'Forbidden: Viewers are not allowed to upload images or assign PTs.' });
    }
    const body = await parseBody(req);
    try {
      // Support both single image or { images: [...] }
      const imgData = body.image || body.images?.[0]?.url || body.images?.[0];
      const result = addImageClassification(ctx.workspaceId, {
        image: imgData,
        ptName: body.ptName,
      }, ctx.userId);
      return sendJson(res, 201, result);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // -------------------------------------------------------------
  // 3. IMAGES & CLASSIFICATIONS LIST
  // -------------------------------------------------------------
  if ((path === '/api/images' || path === '/api/products') && method === 'GET') {
    const search = (query.search || '').toLowerCase();
    const ptFilter = query.pt;
    const categoryFilter = query.category;

    let items = db.classified_images.filter(i => i.workspace_id === ctx.workspaceId);

    if (categoryFilter) {
      items = items.filter(i => i.category_name === categoryFilter);
    }
    if (ptFilter) {
      items = items.filter(i => i.pt_name.toLowerCase() === ptFilter.toLowerCase());
    }
    if (search) {
      items = items.filter(
        i => i.pt_name.toLowerCase().includes(search) || (i.category_name && i.category_name.toLowerCase().includes(search))
      );
    }

    return sendJson(res, 200, { images: items, products: items });
  }

  // Update PT for an image (EDITOR OR ADMIN)
  if (path.startsWith('/api/images/') && path.endsWith('/pt') && method === 'PATCH') {
    if (ctx.role !== 'admin' && ctx.role !== 'editor') {
      return sendJson(res, 403, { error: 'Forbidden: Viewers cannot edit PT classifications.' });
    }
    const imageId = path.split('/')[3];
    const body = await parseBody(req);
    try {
      const updated = updateImagePt(ctx.workspaceId, imageId, body.ptName, ctx.userId);
      return sendJson(res, 200, { success: true, image: updated });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // Delete Image (ADMIN ONLY)
  if ((path.startsWith('/api/images/') || path.startsWith('/api/products/')) && method === 'DELETE') {
    if (ctx.role !== 'admin') {
      return sendJson(res, 403, { error: 'Forbidden: Only workspace Admins are permitted to delete images or classifications.' });
    }
    const parts = path.split('/');
    const id = parts[3];
    try {
      const result = deleteClassifiedImage(ctx.workspaceId, id, ctx.userId);
      return sendJson(res, 200, result);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // -------------------------------------------------------------
  // 4. AUTOMATIC PT GROUPING WITH CREATOR TRACKING
  // -------------------------------------------------------------
  if (path === '/api/pt-groups' && method === 'GET') {
    const groups = getPtGroupsWithImages(ctx.workspaceId);
    return sendJson(res, 200, { groups });
  }

  // Rename PT Group (Admin or Editor)
  if (path === '/api/pt-groups/rename' && method === 'PATCH') {
    if (ctx.role !== 'admin' && ctx.role !== 'editor') {
      return sendJson(res, 403, { error: 'Forbidden: Viewers cannot rename PT groups.' });
    }
    const body = await parseBody(req);
    try {
      const result = renamePtGroup(ctx.workspaceId, body.oldPtName, body.newPtName, ctx.userId);
      return sendJson(res, 200, result);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // Delete PT Group & all images in group (Admin Only)
  if (path.startsWith('/api/pt-groups/') && method === 'DELETE') {
    if (ctx.role !== 'admin') {
      return sendJson(res, 403, { error: 'Forbidden: Only workspace Admins can delete PT groups.' });
    }
    const ptName = decodeURIComponent(path.split('/')[3]);
    try {
      const result = deletePtGroup(ctx.workspaceId, ptName, ctx.userId);
      return sendJson(res, 200, result);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // -------------------------------------------------------------
  // 5. SMART IMAGE SEARCH (CTRL + V PASTE & SIMILARITY)
  // -------------------------------------------------------------
  if (path === '/api/smart-search/image' && method === 'POST') {
    const body = await parseBody(req);
    const { imageData } = body;
    if (!imageData) {
      return sendJson(res, 400, { error: 'Product image (upload or Ctrl+V paste) is required.' });
    }

    const wsImages = db.classified_images.filter(img => img.workspace_id === ctx.workspaceId);
    const matches = searchSimilarImages(imageData, wsImages);

    // Enrich with saved PT and creator tracking
    const enrichedMatches = matches.map(m => {
      const img = wsImages.find(i => i.id === m.imageId || i.image_url === m.imageUrl);
      return {
        ...m,
        saved_pt: img?.pt_name || 'Unassigned',
        category_name: img?.category_name,
        uploaded_by_name: img?.uploaded_by_name,
        uploaded_at: img?.uploaded_at,
        image_url: img?.image_url || m.imageUrl,
      };
    });

    return sendJson(res, 200, {
      matches: enrichedMatches,
      totalMatches: enrichedMatches.length,
    });
  }

  // -------------------------------------------------------------
  // 6. TAXONOMY AUTOCOMPLETE (WALMART EXCEL IMPORT)
  // -------------------------------------------------------------
  if (path === '/api/taxonomy/search' && method === 'GET') {
    const q = query.q || '';
    const cat = query.category || '';
    const results = searchTaxonomy(q, cat, 30);
    return sendJson(res, 200, { results });
  }

  if (path === '/api/taxonomy/categories' && method === 'GET') {
    const categories = getCategories();
    return sendJson(res, 200, { categories });
  }

  // -------------------------------------------------------------
  // 7. TEAM MANAGEMENT & INVITATIONS (ADMIN ONLY)
  // -------------------------------------------------------------
  if (path === '/api/members' && method === 'GET') {
    const members = getWorkspaceMembers(ctx.workspaceId);
    return sendJson(res, 200, { members });
  }

  if (path.startsWith('/api/members/') && path.endsWith('/role') && method === 'PATCH') {
    if (ctx.role !== 'admin') {
      return sendJson(res, 403, { error: 'Forbidden: Only workspace Admins can change member roles.' });
    }
    const memberId = path.split('/')[3];
    const body = await parseBody(req);
    try {
      const updated = updateMemberRole(ctx.workspaceId, memberId, body.role, ctx.userId);
      return sendJson(res, 200, { success: true, member: updated });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  if (path.startsWith('/api/members/') && method === 'DELETE') {
    if (ctx.role !== 'admin') {
      return sendJson(res, 403, { error: 'Forbidden: Only workspace Admins can remove members.' });
    }
    const memberId = path.split('/')[3];
    try {
      const result = removeWorkspaceMember(ctx.workspaceId, memberId, ctx.userId);
      return sendJson(res, 200, result);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  if (path === '/api/invitations' && method === 'GET') {
    if (ctx.role !== 'admin') {
      return sendJson(res, 403, { error: 'Forbidden: Only Admins can view invitations.' });
    }
    const invitations = db.workspace_invitations.filter(i => i.workspace_id === ctx.workspaceId);
    return sendJson(res, 200, { invitations });
  }

  if (path === '/api/invitations/send' && method === 'POST') {
    if (ctx.role !== 'admin') {
      return sendJson(res, 403, { error: 'Forbidden: Only workspace Admins can invite teammates.' });
    }
    const body = await parseBody(req);
    try {
      const result = createInvitation(ctx.workspaceId, body.email, body.role, ctx.userId);
      const appUrl = 'http://localhost:3001';
      const inviteUrl = `${appUrl}${result.inviteLink}`;
      const subject = `Invitation to Walmart PT Classification Workspace (${body.role.toUpperCase()})`;
      const mailBody = `Hi,\n\nYou have been invited to join the Walmart Product Type Classification Library as ${body.role.toUpperCase()}.\n\nAccept your invitation here:\n${inviteUrl}\n\nNote: This invitation is restricted to ${body.email} and expires in 7 days.`;
      const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(body.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;

      return sendJson(res, 201, {
        ...result,
        invitation: {
          ...result.invitation,
          gmailComposeUrl,
        },
        gmailComposeUrl,
      });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  if (path === '/api/invitations/verify' && method === 'GET') {
    const token = query.token;
    const email = query.email;
    const workspaceId = query.workspaceId || ctx.workspaceId;
    const inv = verifyInvitationToken(workspaceId, email, token);
    if (!inv) {
      return sendJson(res, 404, { valid: false, error: 'Invitation not found or has expired.' });
    }
    return sendJson(res, 200, {
      valid: true,
      invitation: {
        id: inv.id,
        email: inv.email,
        assigned_role: inv.assigned_role,
        expires_at: inv.expires_at,
        created_at: inv.created_at,
        workspace_id: inv.workspace_id,
      },
    });
  }

  if (path === '/api/invitations/accept' && method === 'POST') {
    const body = await parseBody(req);
    try {
      const result = acceptInvitation(
        body.workspaceId,
        body.email,
        body.token,
        body.userId,
        {
          full_name: body.full_name || body.fullName,
          avatar_url: body.avatar_url || body.avatarUrl,
        }
      );
      return sendJson(res, 200, result);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  if (path.startsWith('/api/invitations/') && path.endsWith('/cancel') && method === 'POST') {
    if (ctx.role !== 'admin') {
      return sendJson(res, 403, { error: 'Forbidden: Only workspace Admins can cancel invitations.' });
    }
    const invId = path.split('/')[3];
    try {
      const result = cancelInvitation(ctx.workspaceId, invId, ctx.userId);
      return sendJson(res, 200, result);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  if (path.startsWith('/api/invitations/') && path.endsWith('/resend') && method === 'POST') {
    if (ctx.role !== 'admin') {
      return sendJson(res, 403, { error: 'Forbidden: Only workspace Admins can resend invitations.' });
    }
    const invId = path.split('/')[3];
    try {
      const result = resendInvitation(ctx.workspaceId, invId, ctx.userId);
      const appUrl = 'http://localhost:3001';
      const inviteUrl = `${appUrl}${result.inviteLink}`;
      const subject = `Invitation to Walmart PT Classification Workspace (${result.invitation.assigned_role.toUpperCase()})`;
      const mailBody = `Hi,\n\nYou have been invited to join the Walmart Product Type Classification Library as ${result.invitation.assigned_role.toUpperCase()}.\n\nAccept your invitation here:\n${inviteUrl}\n\nNote: This invitation is restricted to ${result.invitation.email} and expires in 7 days.`;
      const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(result.invitation.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;

      return sendJson(res, 200, {
        ...result,
        invitation: {
          ...result.invitation,
          gmailComposeUrl,
        },
        gmailComposeUrl,
      });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // -------------------------------------------------------------
  // 8. TEAM ACTIVITY LOGS (TIMESTAMPS & ACTORS)
  // -------------------------------------------------------------
  if (path === '/api/activity-logs' && method === 'GET') {
    if (ctx.role !== 'admin') {
      return sendJson(res, 403, { error: 'Forbidden: Only workspace Admins can view activity logs.' });
    }
    const logs = db.activity_logs
      .filter(l => l.workspace_id === ctx.workspaceId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return sendJson(res, 200, { logs });
  }

  // -------------------------------------------------------------
  // 9. WORKSPACE STATS & SETTINGS
  // -------------------------------------------------------------
  if (path === '/api/workspace/stats' && method === 'GET') {
    const members = db.workspace_members.filter(m => m.workspace_id === ctx.workspaceId);
    const editors = members.filter(m => m.role === 'editor').length;
    const viewers = members.filter(m => m.role === 'viewer').length;
    const admins = members.filter(m => m.role === 'admin').length;
    const pendingInvites = db.workspace_invitations.filter(
      i => i.workspace_id === ctx.workspaceId && i.status === 'pending'
    ).length;

    const images = db.classified_images.filter(i => i.workspace_id === ctx.workspaceId);
    const ptGroups = new Set(images.map(i => i.pt_name)).size;

    return sendJson(res, 200, {
      stats: {
        totalMembers: members.length,
        totalEditors: editors,
        totalViewers: viewers,
        totalAdmins: admins,
        pendingInvitations: pendingInvites,
        totalImages: images.length,
        totalPTGroups: ptGroups,
      },
    });
  }

  return sendJson(res, 404, { error: `Not found: ${method} ${path}` });
}

export function startApiServer(port = 3001) {
  const server = http.createServer(handleApiRequest);
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`Unified Server running on http://localhost:${port}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}
