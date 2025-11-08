"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Search,
  Trash2,
  UserPlus,
  Download,
  X,
  Edit3,
  Copy,
  Filter,
  ArrowUpDown,
  Users,
  Mail,
  Briefcase,
  Calendar,
  Settings2,
} from "lucide-react";
import { AddEmployeeDialog } from "./AddEmployeeDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { getOrganizationEmployees, deleteEmployee } from "@/lib/firebase/admin";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Employee as AdminEmployee } from "@/lib/firebase/admin";

type UIEmployee = {
  uid: string;
  name: string;
  email: string;
  department?: string;
  role?: string;
  joinedDate?: string;
};

const PAGE_SIZES = [10, 20, 50];

function parseQuery(query: string) {
  const filters: Record<string, string> = {};
  const terms: string[] = [];

  const quoteRe = /"([^"]+)"/g;
  let m;
  const usedSpans: [number, number][] = [];
  while ((m = quoteRe.exec(query))) {
    terms.push(m[1].trim().toLowerCase());
    usedSpans.push([m.index, m.index + m[0].length]);
  }

  let remaining = query.replace(quoteRe, " ");

  const filterRe = /\b(role|dept|department|uid):\s*([^\s"']+)\b/gi;
  while ((m = filterRe.exec(remaining))) {
    const key = m[1].toLowerCase();
    const val = m[2].toLowerCase();
    if (key === "department") filters["dept"] = val;
    else filters[key] = val;
    usedSpans.push([m.index, m.index + m[0].length]);
  }

  remaining = remaining.replace(filterRe, " ");

  remaining
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .forEach((t) => terms.push(t.toLowerCase()));

  const uniqTerms = Array.from(new Set(terms));

  return { terms: uniqTerms, filters };
}

function highlight(text = "", terms: string[]) {
  if (!text || terms.length === 0) return [{ text, match: false }];
  const lc = text.toLowerCase();
  const hits: { pos: number; len: number }[] = [];
  for (const t of terms) {
    if (!t) continue;
    let i = 0;
    while ((i = lc.indexOf(t.toLowerCase(), i)) !== -1) {
      hits.push({ pos: i, len: t.length });
      i += t.length;
    }
  }
  if (hits.length === 0) return [{ text, match: false }];

  hits.sort((a, b) => a.pos - b.pos);
  const merged: { start: number; end: number }[] = [];
  for (const h of hits) {
    const s = h.pos;
    const e = h.pos + h.len;
    const last = merged[merged.length - 1];
    if (!last || s > last.end) merged.push({ start: s, end: e });
    else if (e > last.end) last.end = e;
  }

  const out: { text: string; match: boolean }[] = [];
  let cursor = 0;
  for (const seg of merged) {
    if (seg.start > cursor)
      out.push({ text: text.slice(cursor, seg.start), match: false });
    out.push({ text: text.slice(seg.start, seg.end), match: true });
    cursor = seg.end;
  }
  if (cursor < text.length)
    out.push({ text: text.slice(cursor), match: false });
  return out;
}

export function EmployeesView() {
  const { user } = useAuth();

  const [employees, setEmployees] = useState<UIEmployee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "joined">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  const [showAddDialog, setShowAddDialog] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<UIEmployee | null>(null);

  const fetchEmployees = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const list = await getOrganizationEmployees(user.uid);
      const normalized: UIEmployee[] = (list || []).map(
        (e: AdminEmployee | any) => {
          const uid = e.uid || e.id || "";
          const name =
            e.firstName || e.lastName
              ? `${(e.firstName || "").trim()} ${(e.lastName || "").trim()}`.trim()
              : e.name || e.email || "Unknown";
          const email = e.email || "";
          const department = e.department || "";
          const role = e.role || "employee";
          let joinedDate = "";
          if (e.createdAt) {
            try {
              if (typeof e.createdAt === "object" && e.createdAt?.toDate)
                joinedDate = e.createdAt.toDate().toISOString().split("T")[0];
              else
                joinedDate = new Date(e.createdAt).toISOString().split("T")[0];
            } catch {
              joinedDate = String(e.createdAt);
            }
          } else if (e.joinedDate) {
            joinedDate = String(e.joinedDate);
          }

          return { uid, name, email, department, role, joinedDate };
        },
      );

      setEmployees(normalized);
      setPage(1);
    } catch (err) {
      console.error("fetch employees error", err);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const filteredSorted = useMemo(() => {
    const q = debouncedQuery || "";
    if (!q) {
      const copy = employees.slice();
      copy.sort((a, b) => {
        if (sortBy === "joined") {
          const ta = a.joinedDate ? new Date(a.joinedDate).getTime() : 0;
          const tb = b.joinedDate ? new Date(b.joinedDate).getTime() : 0;
          return sortDir === "asc" ? ta - tb : tb - ta;
        }
        const na = (a.name || "").toLowerCase();
        const nb = (b.name || "").toLowerCase();
        if (na < nb) return sortDir === "asc" ? -1 : 1;
        if (na > nb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
      return copy;
    }

    const { terms, filters } = parseQuery(q);
    const matches = employees.filter((e) => {
      if (filters.role && (e.role || "").toLowerCase() !== filters.role)
        return false;
      if (filters.dept && (e.department || "").toLowerCase() !== filters.dept)
        return false;
      if (filters.uid && !(e.uid || "").toLowerCase().includes(filters.uid))
        return false;

      for (const t of terms) {
        const lc = t.toLowerCase();
        const found =
          (e.name || "").toLowerCase().includes(lc) ||
          (e.email || "").toLowerCase().includes(lc) ||
          (e.department || "").toLowerCase().includes(lc) ||
          (e.uid || "").toLowerCase().includes(lc) ||
          (e.role || "").toLowerCase().includes(lc);
        if (!found) return false;
      }
      return true;
    });

    matches.sort((a, b) => {
      if (sortBy === "joined") {
        const ta = a.joinedDate ? new Date(a.joinedDate).getTime() : 0;
        const tb = b.joinedDate ? new Date(b.joinedDate).getTime() : 0;
        return sortDir === "asc" ? ta - tb : tb - ta;
      }
      const na = (a.name || "").toLowerCase();
      const nb = (b.name || "").toLowerCase();
      if (na < nb) return sortDir === "asc" ? -1 : 1;
      if (na > nb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return matches;
  }, [employees, debouncedQuery, sortBy, sortDir]);

  const total = filteredSorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const visible = filteredSorted.slice((page - 1) * pageSize, page * pageSize);

  const handleDeleteEmployee = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEmployee(deleteTarget.uid);
      toast.success("Employee removed successfully");
      await fetchEmployees();
    } catch (err: any) {
      console.error("delete employee error", err);
      toast.error(err?.message || "Failed to remove employee");
    } finally {
      setDeleteTarget(null);
    }
  };

  const exportCSV = () => {
    if (filteredSorted.length === 0) {
      toast("No employees to export");
      return;
    }
    const headers = [
      "UID",
      "Name",
      "Email",
      "Department",
      "Role",
      "JoinedDate",
    ];
    const rows = filteredSorted.map((r) => [
      r.uid,
      r.name,
      r.email,
      r.department || "",
      r.role || "",
      r.joinedDate || "",
    ]);
    const csv = [
      "\uFEFF" + headers.join(","),
      ...rows.map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Export started");
  };

  const copyUid = async (uid?: string) => {
    if (!uid) return;
    try {
      await navigator.clipboard.writeText(uid);
      toast.success("UID copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="w-full h-full px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">
            Employee Management
          </h2>
          <p className="text-muted-foreground">
            Manage your team • {employees.length} member
            {employees.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={exportCSV}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>

          <Button
            onClick={() => setShowAddDialog(true)}
            size="sm"
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 pb-4 border-b">
        {/* Search Bar - Shadcn Style */}
        <div
          className={cn(
            "relative w-full lg:w-80 transition-all duration-200",
            searchFocused || searchQuery
              ? "lg:w-96 ring-2 ring-primary/30 rounded-md"
              : "",
          )}
        >
          <div
            className={cn(
              "relative rounded-md transition-all duration-200",
              searchFocused
                ? "bg-blue-50 dark:bg-blue-950/20"
                : "bg-background",
            )}
          >
            <Search
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200",
                searchFocused || searchQuery
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            />
            <Input
              placeholder="Search employees by name, email, dept..."
              className={cn(
                "pl-9 pr-9 h-10 border-0 bg-transparent",
                searchFocused && "shadow-sm",
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors duration-200",
                  searchFocused
                    ? "text-primary hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 hidden lg:block" />

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort By */}
          <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-muted/50 border flex-shrink-0">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "joined")}
              className="bg-transparent text-sm font-medium cursor-pointer focus:outline-none"
            >
              <option value="name">Name</option>
              <option value="joined">Join Date</option>
            </select>
          </div>

          {/* Sort Direction */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="h-9"
          >
            {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
          </Button>

          {/* Page Size */}
          <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-muted/50 border flex-shrink-0">
            <Settings2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Items</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-transparent text-sm font-semibold cursor-pointer focus:outline-none w-12"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search Tips */}
      {searchQuery && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
          <div className="flex items-start gap-2">
            <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Pro tip:</strong> Use filters like{" "}
              <code className="bg-white dark:bg-blue-900 px-1.5 py-0.5 rounded font-mono text-xs">
                role:admin
              </code>{" "}
              <code className="bg-white dark:bg-blue-900 px-1.5 py-0.5 rounded font-mono text-xs">
                dept:engineering
              </code>
            </p>
          </div>
        </div>
      )}

      {/* Employee List Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Team Directory</CardTitle>
              <CardDescription className="text-xs">
                Page {page} of {pageCount} • Showing {visible.length} of {total}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length > 0 ? (
            <div className="space-y-2">
              {visible.map((emp) => {
                const qterms = parseQuery(debouncedQuery).terms;
                const nameParts = highlight(emp.name, qterms);
                const emailParts = highlight(emp.email, qterms);
                const deptParts = highlight(emp.department || "", qterms);

                return (
                  <div
                    key={emp.uid || emp.email}
                    className="group flex items-center gap-3 p-3 rounded-lg border-2 hover:border-primary/50 hover:bg-accent/50 transition-all"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-lg font-bold shadow-sm">
                      {emp.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold truncate">
                          {nameParts.map((p, i) =>
                            p.match ? (
                              <mark
                                key={i}
                                className="bg-yellow-200 dark:bg-yellow-900 rounded px-1"
                              >
                                {p.text}
                              </mark>
                            ) : (
                              <span key={i}>{p.text}</span>
                            ),
                          )}
                        </p>
                        <Badge
                          variant={
                            emp.role === "admin" ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {emp.role}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">
                          {emailParts.map((p, i) =>
                            p.match ? (
                              <mark
                                key={i}
                                className="bg-yellow-200 dark:bg-yellow-900 rounded px-1"
                              >
                                {p.text}
                              </mark>
                            ) : (
                              <span key={i}>{p.text}</span>
                            ),
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {emp.department && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs">
                            <Briefcase className="w-3 h-3" />
                            {deptParts.map((p, i) =>
                              p.match ? (
                                <mark
                                  key={i}
                                  className="bg-yellow-200 dark:bg-yellow-900 rounded px-1"
                                >
                                  {p.text}
                                </mark>
                              ) : (
                                <span key={i}>{p.text}</span>
                              ),
                            )}
                          </span>
                        )}
                        {emp.joinedDate && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {emp.joinedDate}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyUid(emp.uid)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast("Edit feature coming soon")}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(emp)}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <UserPlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-lg font-semibold text-muted-foreground mb-1">
                No employees found
              </p>
              <p className="text-sm text-muted-foreground">
                {debouncedQuery
                  ? "Try adjusting your search"
                  : 'Click "Add Employee" to get started'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {visible.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    {(page - 1) * pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-foreground">
                    {Math.min(page * pageSize, total)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-foreground">{total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <div className="px-3 py-1 text-sm font-semibold bg-primary/10 text-primary rounded-md min-w-10 text-center">
                    {page}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page >= pageCount}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AddEmployeeDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={() => {
          setShowAddDialog(false);
          fetchEmployees();
          toast.success("Employee added successfully");
        }}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        employeeName={deleteTarget?.name || ""}
        onConfirm={handleDeleteEmployee}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
