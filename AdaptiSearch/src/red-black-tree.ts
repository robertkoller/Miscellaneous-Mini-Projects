// Self-balancing BST used for range queries on numeric and date fields.
// Supports filters like price: { min: 20, max: 100 } or date ranges.

import { DocId } from './types';

const enum Color { RED, BLACK }

interface RBNode<K> {
  key: K;
  ids: Set<DocId>;
  color: Color;
  left: RBNode<K>;
  right: RBNode<K>;
  parent: RBNode<K>;
}

export class RedBlackTree<K> {
  private readonly nil: RBNode<K>;
  private root: RBNode<K>;

  constructor(private readonly compare: (a: K, b: K) => number) {
    // Sentinel nil — avoids null checks throughout
    this.nil = { key: null as unknown as K, ids: new Set(), color: Color.BLACK } as RBNode<K>;
    this.nil.left = this.nil;
    this.nil.right = this.nil;
    this.nil.parent = this.nil;
    this.root = this.nil;
  }

  private mkNode(key: K, id: DocId): RBNode<K> {
    return { key, ids: new Set([id]), color: Color.RED, left: this.nil, right: this.nil, parent: this.nil };
  }

  insert(key: K, id: DocId): void {
    let p = this.nil;
    let cur = this.root;
    while (cur !== this.nil) {
      p = cur;
      const cmp = this.compare(key, cur.key);
      if (cmp === 0) { cur.ids.add(id); return; }
      cur = cmp < 0 ? cur.left : cur.right;
    }
    const z = this.mkNode(key, id);
    z.parent = p;
    if (p === this.nil) this.root = z;
    else if (this.compare(key, p.key) < 0) p.left = z;
    else p.right = z;
    this.fixInsert(z);
  }

  private fixInsert(z: RBNode<K>): void {
    while (z.parent.color === Color.RED) {
      if (z.parent === z.parent.parent.left) {
        const y = z.parent.parent.right;
        if (y.color === Color.RED) {
          // Case 1: uncle red — recolor
          z.parent.color = Color.BLACK;
          y.color = Color.BLACK;
          z.parent.parent.color = Color.RED;
          z = z.parent.parent;
        } else {
          if (z === z.parent.right) {
            // Case 2: uncle black, z is right child — rotate to case 3
            z = z.parent;
            this.rotateLeft(z);
          }
          // Case 3: uncle black, z is left child
          z.parent.color = Color.BLACK;
          z.parent.parent.color = Color.RED;
          this.rotateRight(z.parent.parent);
        }
      } else {
        const y = z.parent.parent.left;
        if (y.color === Color.RED) {
          z.parent.color = Color.BLACK;
          y.color = Color.BLACK;
          z.parent.parent.color = Color.RED;
          z = z.parent.parent;
        } else {
          if (z === z.parent.left) {
            z = z.parent;
            this.rotateRight(z);
          }
          z.parent.color = Color.BLACK;
          z.parent.parent.color = Color.RED;
          this.rotateLeft(z.parent.parent);
        }
      }
    }
    this.root.color = Color.BLACK;
  }

  private rotateLeft(x: RBNode<K>): void {
    const y = x.right;
    x.right = y.left;
    if (y.left !== this.nil) y.left.parent = x;
    y.parent = x.parent;
    if (x.parent === this.nil) this.root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
  }

  private rotateRight(y: RBNode<K>): void {
    const x = y.left;
    y.left = x.right;
    if (x.right !== this.nil) x.right.parent = y;
    x.parent = y.parent;
    if (y.parent === this.nil) this.root = x;
    else if (y === y.parent.right) y.parent.right = x;
    else y.parent.left = x;
    x.right = y;
    y.parent = x;
  }

  private transplant(u: RBNode<K>, v: RBNode<K>): void {
    if (u.parent === this.nil) this.root = v;
    else if (u === u.parent.left) u.parent.left = v;
    else u.parent.right = v;
    v.parent = u.parent;
  }

  private minimum(node: RBNode<K>): RBNode<K> {
    while (node.left !== this.nil) node = node.left;
    return node;
  }

  removeId(key: K, id: DocId): void {
    const node = this.findNode(key);
    if (!node) return;
    node.ids.delete(id);
    if (node.ids.size === 0) this.deleteNode(node);
  }

  private findNode(key: K): RBNode<K> | null {
    let cur = this.root;
    while (cur !== this.nil) {
      const cmp = this.compare(key, cur.key);
      if (cmp === 0) return cur;
      cur = cmp < 0 ? cur.left : cur.right;
    }
    return null;
  }

  private deleteNode(z: RBNode<K>): void {
    let y = z;
    let yColor = y.color;
    let x: RBNode<K>;

    if (z.left === this.nil) {
      x = z.right;
      this.transplant(z, z.right);
    } else if (z.right === this.nil) {
      x = z.left;
      this.transplant(z, z.left);
    } else {
      y = this.minimum(z.right);
      yColor = y.color;
      x = y.right;
      if (y.parent === z) {
        x.parent = y;
      } else {
        this.transplant(y, y.right);
        y.right = z.right;
        y.right.parent = y;
      }
      this.transplant(z, y);
      y.left = z.left;
      y.left.parent = y;
      y.color = z.color;
      // y.ids intentionally kept — y retains its own key's IDs; z's are discarded
    }

    if (yColor === Color.BLACK) this.fixDelete(x);
  }

  private fixDelete(x: RBNode<K>): void {
    while (x !== this.root && x.color === Color.BLACK) {
      if (x === x.parent.left) {
        let w = x.parent.right;
        if (w.color === Color.RED) {
          // Case 1
          w.color = Color.BLACK;
          x.parent.color = Color.RED;
          this.rotateLeft(x.parent);
          w = x.parent.right;
        }
        if (w.left.color === Color.BLACK && w.right.color === Color.BLACK) {
          // Case 2
          w.color = Color.RED;
          x = x.parent;
        } else {
          if (w.right.color === Color.BLACK) {
            // Case 3
            w.left.color = Color.BLACK;
            w.color = Color.RED;
            this.rotateRight(w);
            w = x.parent.right;
          }
          // Case 4
          w.color = x.parent.color;
          x.parent.color = Color.BLACK;
          w.right.color = Color.BLACK;
          this.rotateLeft(x.parent);
          x = this.root;
        }
      } else {
        let w = x.parent.left;
        if (w.color === Color.RED) {
          w.color = Color.BLACK;
          x.parent.color = Color.RED;
          this.rotateRight(x.parent);
          w = x.parent.left;
        }
        if (w.right.color === Color.BLACK && w.left.color === Color.BLACK) {
          w.color = Color.RED;
          x = x.parent;
        } else {
          if (w.left.color === Color.BLACK) {
            w.right.color = Color.BLACK;
            w.color = Color.RED;
            this.rotateLeft(w);
            w = x.parent.left;
          }
          w.color = x.parent.color;
          x.parent.color = Color.BLACK;
          w.left.color = Color.BLACK;
          this.rotateRight(x.parent);
          x = this.root;
        }
      }
    }
    x.color = Color.BLACK;
  }

  rangeQuery(min: K | undefined, max: K | undefined): Set<DocId> {
    const result = new Set<DocId>();
    this._range(this.root, min, max, result);
    return result;
  }

  private _range(node: RBNode<K>, min: K | undefined, max: K | undefined, out: Set<DocId>): void {
    if (node === this.nil) return;
    const aboveMin = min === undefined || this.compare(node.key, min) >= 0;
    const belowMax = max === undefined || this.compare(node.key, max) <= 0;
    if (aboveMin && belowMax) {
      for (const id of node.ids) out.add(id);
    }
    // Left subtree can only have keys < node.key, worth visiting if node.key > min
    if (min === undefined || this.compare(node.key, min) > 0) {
      this._range(node.left, min, max, out);
    }
    // Right subtree can only have keys > node.key, worth visiting if node.key < max
    if (max === undefined || this.compare(node.key, max) < 0) {
      this._range(node.right, min, max, out);
    }
  }
}
