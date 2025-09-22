const PUBLIC_PATH = ['/login', '/register'];

export function isPublicPath(path) {
  return PUBLIC_PATH.includes(path);
}
