"""git_tree.py — read the repository as it is on disk, or as it was at a commit, through one interface.

A whole-set gate with a standing backlog has to tell a pre-existing finding from a new one. The honest way is
to run the same check against the merge base. A worktree of this repository is ~840 MB, so instead the check
reads the base commit straight from git (`ls-tree` for what exists, one `cat-file --batch` process for
contents). Both trees cache reads, because a locale check reads the same reference pages hundreds of times.

    tree = WorkTree(root)            # the checkout, uncommitted edits included
    tree = GitTree(root, "<sha>")    # the tree of a commit
    tree.read(rel) / tree.exists(rel) / tree.isdir(rel) / tree.children_with_index(dir_rel)
"""

import io
import os
import subprocess


class TreeUnavailable(Exception):
    """The commit cannot be read (shallow clone, wrong ref): callers report UNKNOWN."""


class WorkTree:
    def __init__(self, root):
        self.root = root
        self._cache = {}

    def read(self, rel):
        if rel not in self._cache:
            with io.open(os.path.join(self.root, rel), encoding="utf-8", errors="replace") as fh:
                self._cache[rel] = fh.read()
        return self._cache[rel]

    def exists(self, rel):
        return os.path.exists(os.path.join(self.root, rel))

    def isdir(self, rel):
        return os.path.isdir(os.path.join(self.root, rel))

    def children_with_index(self, dir_rel):
        """Sorted '<dir_rel>/<child>/index.html' paths."""
        base = os.path.join(self.root, dir_rel)
        if not os.path.isdir(base):
            return []
        return sorted(f"{dir_rel}/{c}/index.html" for c in os.listdir(base)
                      if os.path.isfile(os.path.join(base, c, "index.html")))

    def files_under(self, dir_rel, suffix=""):
        out = []
        for dirpath, _d, files in os.walk(os.path.join(self.root, dir_rel)):
            for f in files:
                if f.endswith(suffix):
                    out.append(os.path.relpath(os.path.join(dirpath, f), self.root).replace(os.sep, "/"))
        return sorted(out)


class GitTree:
    def __init__(self, root, rev):
        self.root, self.rev = root, rev
        r = subprocess.run(["git", "ls-tree", "-r", "--name-only", rev], cwd=root,
                           capture_output=True, text=True)
        if r.returncode != 0:
            raise TreeUnavailable(f"cannot list {rev!r}: {r.stderr.strip()}")
        self._files = set(r.stdout.splitlines())
        self._dirs = set()
        for f in self._files:
            parts = f.split("/")
            for i in range(1, len(parts)):
                self._dirs.add("/".join(parts[:i]))
        self._cache = {}
        self._proc = None

    def _batch(self):
        if self._proc is None:
            self._proc = subprocess.Popen(["git", "cat-file", "--batch"], cwd=self.root,
                                          stdin=subprocess.PIPE, stdout=subprocess.PIPE)
        return self._proc

    def read(self, rel):
        if rel in self._cache:
            return self._cache[rel]
        if rel not in self._files:
            raise FileNotFoundError(rel)
        p = self._batch()
        p.stdin.write(f"{self.rev}:{rel}\n".encode("utf-8"))
        p.stdin.flush()
        header = p.stdout.readline().decode("utf-8").split()
        if len(header) < 3 or header[1] == "missing":
            raise FileNotFoundError(rel)
        size = int(header[2])
        data = p.stdout.read(size)
        p.stdout.read(1)  # trailing newline
        text = data.decode("utf-8", errors="replace")
        self._cache[rel] = text
        return text

    def exists(self, rel):
        rel = rel.rstrip("/")
        return rel in self._files or rel in self._dirs

    def isdir(self, rel):
        return rel.rstrip("/") in self._dirs

    def children_with_index(self, dir_rel):
        prefix = dir_rel.rstrip("/") + "/"
        return sorted(f for f in self._files
                      if f.startswith(prefix) and f.count("/") == prefix.count("/") + 1
                      and f.endswith("/index.html"))

    def files_under(self, dir_rel, suffix=""):
        prefix = dir_rel.rstrip("/") + "/"
        return sorted(f for f in self._files if f.startswith(prefix) and f.endswith(suffix))

    def close(self):
        if self._proc:
            self._proc.stdin.close()
            self._proc.wait()
            self._proc = None
