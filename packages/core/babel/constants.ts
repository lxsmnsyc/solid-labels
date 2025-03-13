import * as t from '@babel/types';

export const UNDEFINED = t.unaryExpression('void', t.numericLiteral(0));
