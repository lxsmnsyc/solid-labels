import type * as babel from '@babel/core';

export function unexpectedType<T>(
  path: babel.NodePath<T>,
  received: string,
  expected: string,
): Error {
  return path.buildCodeFrameError(
    `Unexpected '${received}' (Expected: ${expected})`,
  );
}

export function unexpectedMissingParent<T>(path: babel.NodePath<T>): Error {
  return path.buildCodeFrameError('Unexpected missing parent.');
}

export function unexpectedArgumentLength<T>(
  path: babel.NodePath<T>,
  received: number,
  expected: number,
): Error {
  return path.buildCodeFrameError(
    `Unexpected argument length of ${received} (Expected: ${expected})`,
  );
}

export function unexpectedAssignmentOperator<T>(
  path: babel.NodePath<T>,
  received: string,
  expected: string,
): Error {
  return path.buildCodeFrameError(
    `Unexpected assignment operator '${received}' (Expected: ${expected})`,
  );
}
