import type { ZodRawShape, ZodTypeAny } from 'zod';

import { z } from 'zod';

import { resolveFieldNamePath } from '../core/field-name';

function isArrayIndex(segment: string | undefined) {
  return segment !== undefined && /^\d+$/.test(segment);
}

export function setValueByPath(
  target: Record<string, any>,
  path: string,
  value: any,
) {
  const { pathSegments, rawKey } = resolveFieldNamePath(path);
  if (rawKey) {
    target[rawKey] = value;
    return;
  }

  let current: any = target;
  for (let index = 0; index < pathSegments.length; index++) {
    const segment = pathSegments[index];
    if (!segment) continue;
    const isLast = index === pathSegments.length - 1;
    if (isLast) {
      if (Array.isArray(current) && isArrayIndex(segment)) {
        current[Number(segment)] = value;
      } else {
        current[segment] = value;
      }
      continue;
    }

    const nextSegment = pathSegments[index + 1];
    const nextValue = isArrayIndex(nextSegment) ? [] : {};

    if (Array.isArray(current) && isArrayIndex(segment)) {
      current[Number(segment)] ??= nextValue;
      current = current[Number(segment)];
      continue;
    }

    current[segment] ??= nextValue;
    current = current[segment];
  }
}

export function getValueByPath(target: Record<string, any>, path: string) {
  const { pathSegments, rawKey } = resolveFieldNamePath(path);
  if (rawKey) {
    return target[rawKey];
  }

  let current: any = target;
  for (const segment of pathSegments) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

export function deleteValueByPath(target: Record<string, any>, path: string) {
  const { pathSegments, rawKey } = resolveFieldNamePath(path);
  if (rawKey) {
    Reflect.deleteProperty(target, rawKey);
    return;
  }

  let current: any = target;
  for (const segment of pathSegments.slice(0, -1)) {
    if (!current || typeof current !== 'object') {
      return;
    }
    current = current[segment];
  }

  const last = pathSegments.at(-1);
  if (last && current && typeof current === 'object') {
    Reflect.deleteProperty(current, last);
  }
}

function buildNestedShape(
  pathSegments: string[],
  rule: ZodTypeAny,
): ZodTypeAny {
  const [head, ...tail] = pathSegments;
  if (!head) {
    return rule;
  }
  if (tail.length === 0) {
    return z.object({ [head]: rule });
  }
  return z.object({ [head]: buildNestedShape(tail, rule) });
}

function mergeObjects(left: ZodTypeAny, right: ZodTypeAny): ZodTypeAny {
  const leftShape = (left as any).shape;
  const rightShape = (right as any).shape;
  if (!leftShape || !rightShape) {
    return right;
  }
  return z.object(mergeZodShape(leftShape, rightShape));
}

function mergeZodShape(left: ZodRawShape, right: ZodRawShape): ZodRawShape {
  const shape: ZodRawShape = { ...left };
  for (const [key, value] of Object.entries(right)) {
    const current = shape[key];
    shape[key] = current ? mergeObjects(current, value) : value;
  }
  return shape;
}

export function setZodShapeByPath(
  shape: ZodRawShape,
  path: string,
  rule: ZodTypeAny,
) {
  const { pathSegments, rawKey } = resolveFieldNamePath(path);
  if (rawKey) {
    shape[rawKey] = rule;
    return;
  }
  if (pathSegments.length <= 1) {
    shape[path] = rule;
    return;
  }

  const nested = buildNestedShape(pathSegments, rule) as any;
  Object.assign(shape, mergeZodShape(shape, nested.shape));
}
