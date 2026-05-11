export const safeFilename = (name) => String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
