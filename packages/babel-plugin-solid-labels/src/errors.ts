import { NodePath } from "@babel/traverse";

export function unexpectedType<T>(
  path: NodePath<T>,
  received: string,
  expected: string,
): Error {
  return path.buildCodeFrameError(`Unexpected '${received}' (Expected: ${expected})`); 
}

export function unexpectedMissingParent<T>(
  path: NodePath<T>
): Error {
  return path.buildCodeFrameError('Unexpected missing parent.');
}

export function unexpectedArgumentLength<T>(
  path: NodePath<T>,
  received: number,
  expected: number,
): Error {
  return path.buildCodeFrameError(`Unexpected argument length of ${received} (Expected: ${expected})`);
}
