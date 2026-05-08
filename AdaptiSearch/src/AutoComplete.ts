// Prefix trie for autocomplete suggestions. As the user types, the last word
// is looked up here to show matching completions in the search input dropdown.

interface TrieNodeA {
  children: Map<string, TrieNodeA>;
  isEnd: boolean;
}

function createNode(): TrieNodeA {
  return { children: new Map(), isEnd: false };
}

export class AutoComplete {
  private root: TrieNodeA = createNode();
  
  // inserts a word
  insert(word: string): void {
    const w = word.toLowerCase();
    let node = this.root;
    for (const ch of w) {
      if (!node.children.has(ch)){
        node.children.set(ch, createNode());
      }
      node = node.children.get(ch)!;
    }
    node.isEnd = true;
  }

  // Returns all words with the given prefix
  search(prefix: string): Set<string> {
    if (prefix == null){
        return new Set();
    }
    const p = prefix.toLowerCase();
    const curr = this.getToPrefix(p, this.root, 0);
    const results = new Set<string>;
    this.searchRecursive(p, curr, results);
    return results;
  }

  private getToPrefix(prefix: string, curr: TrieNodeA | undefined, index: number): TrieNodeA | undefined {
    if (index == prefix.length || curr == undefined){
        return curr;
    }

    return this.getToPrefix(prefix, curr.children.get(prefix.charAt(index)), index + 1);
  }

  private searchRecursive(soFar: string, curr: TrieNodeA | undefined, results: Set<string>): void{
    if (curr == undefined){
        return;
    }
    if (curr.isEnd){
        results.add(soFar);
    }
    for (const [char, child] of curr.children) {
        this.searchRecursive(soFar + char, child, results)
    }
  }


  // removes a word
  remove(word: string): void {
    this.removeRecursive(word, 0, this.root)
  }

  private removeRecursive(word: string, index: number, curr: TrieNodeA | undefined): void{
    if (curr == null){
        return;
    }
    if (index == word.length){
        curr.isEnd = false;
        return;
    }

    this.removeRecursive(word, index + 1, curr.children.get(word.charAt(index)))
  }
}
