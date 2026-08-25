import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();
router.use(authMiddleware);

const ARTIFACT_ROOT = path.join(process.cwd(), 'uploads', 'ai-artifacts');

/**
 * Load an artifact and verify the requester belongs to its workspace.
 * Artifact IDs from the client are only ever used for lookup + membership
 * validation — ownership is enforced server-side, never trusted.
 */
function loadAuthorizedArtifact(req, res) {
  const { publicId } = req.params;
  const artifact = db.prepare(
    'SELECT * FROM ai_artifacts WHERE public_id = ?'
  ).get(publicId);

  if (!artifact) {
    res.status(404).json({ error: 'Artifact not found', code: 'ARTIFACT_NOT_FOUND' });
    return null;
  }

  const membership = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(artifact.workspace_id, req.user.id);

  if (!membership) {
    res.status(403).json({ error: 'دسترسی به این فایل مجاز نیست', code: 'ARTIFACT_FORBIDDEN' });
    return null;
  }

  // Defense in depth: storage path must stay inside the artifact root.
  const resolvedRoot = path.resolve(ARTIFACT_ROOT);
  const resolvedPath = path.resolve(artifact.storage_path);
  if (!resolvedPath.startsWith(resolvedRoot)) {
    res.status(500).json({ error: 'Invalid artifact storage', code: 'ARTIFACT_INVALID' });
    return null;
  }
  if (!fs.existsSync(resolvedPath)) {
    res.status(410).json({ error: 'فایل دیگر موجود نیست', code: 'ARTIFACT_GONE' });
    return null;
  }

  return artifact;
}

// Inline view (PDF viewer in browser)
router.get('/:publicId', (req, res) => {
  const artifact = loadAuthorizedArtifact(req, res);
  if (!artifact) return;
  res.setHeader('Content-Type', artifact.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(artifact.filename)}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  fs.createReadStream(artifact.storage_path).pipe(res);
});

// Forced download
router.get('/:publicId/download', (req, res) => {
  const artifact = loadAuthorizedArtifact(req, res);
  if (!artifact) return;
  res.setHeader('Content-Type', artifact.mime_type);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(artifact.filename)}"`);
  res.setHeader('Content-Length', String(artifact.size));
  fs.createReadStream(artifact.storage_path).pipe(res);
});

export default router;
