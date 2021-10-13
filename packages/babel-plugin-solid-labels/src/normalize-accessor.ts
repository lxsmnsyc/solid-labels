import * as t from '@babel/types';

export default function normalizeAccessor(
  identifier: t.Expression,
): t.Expression {
  return (
    t.isCallExpression(identifier)
    && identifier.arguments.length === 0
    && t.isExpression(identifier.callee)
      ? identifier.callee
      : t.arrowFunctionExpression(
        [],
        identifier,
      )
  );
}
