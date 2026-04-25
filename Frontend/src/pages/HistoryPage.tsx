import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Filter, LayoutGrid, LayoutList, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface HistoryRecord {
  id: string;
  filename: string;
  timestamp: string;
  status: string;
  confidence: number;
  top_prediction: { name: string; description: string; code: string; confidence: number } | null;
  predictions: Array<{ name: string; description: string; code: string; confidence: number }>;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/history")
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error("Error fetching history:", err));
  }, []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [diseaseFilter, setDiseaseFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedAnalysis, setSelectedAnalysis] = useState<HistoryRecord | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    return history.filter((a) => {
      const predName = a.top_prediction?.name || "Healthy";
      if (search && !a.filename.toLowerCase().includes(search.toLowerCase()) && !predName.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && a.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (diseaseFilter !== "all" && predName !== diseaseFilter) return false;
      return true;
    });
  }, [history, search, statusFilter, diseaseFilter]);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);
  const diseases = [...new Set(history.map((a) => a.top_prediction?.name || "Healthy"))];

  const statusBadge = (s: string) => {
    if (s === "Disease Detected") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Disease Detected</Badge>;
    if (s === "Healthy") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Healthy</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Low Risk</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Analysis History</h1>
        <p className="text-muted-foreground">View and manage all past analyses</p>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename or prediction..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 focus-visible:ring-primary"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="disease detected">Disease Detected</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="low risk">Low Risk</SelectItem>
              </SelectContent>
            </Select>
            <Select value={diseaseFilter} onValueChange={(v) => { setDiseaseFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Diseases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Diseases</SelectItem>
                {diseases.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || statusFilter !== "all" || diseaseFilter !== "all") && (
              <Button
                variant="ghost-primary"
                size="sm"
                onClick={() => { setSearch(""); setStatusFilter("all"); setDiseaseFilter("all"); setPage(1); }}
              >
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
            <div className="flex border rounded-md ml-auto">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-r-none"
                onClick={() => setViewMode("table")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-l-none"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {viewMode === "table" ? (
        <Card className="shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">ID</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Patient</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Prediction</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Confidence</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((a) => (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedAnalysis(a)}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{a.id.substring(0, 8)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">Patient {a.id.substring(0, 4)}</p>
                      <p className="text-xs text-muted-foreground">{a.filename}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{format(new Date(a.timestamp), "MMM d, yyyy HH:mm")}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{a.top_prediction?.name || "Healthy"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={a.confidence * 100} className="h-1.5 w-16 [&>div]:gradient-primary" />
                        <span className="text-xs text-muted-foreground">{Math.round(a.confidence * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{statusBadge(a.status)}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedAnalysis(a); }}>
                        <Eye className="h-4 w-4 text-primary" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map((a) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
                onClick={() => setSelectedAnalysis(a)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">{a.id.substring(0, 8)}</span>
                    {statusBadge(a.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Patient {a.id.substring(0, 4)}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(a.timestamp), "MMM d, yyyy HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">{a.top_prediction?.name || "Healthy"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={a.confidence * 100} className="h-1.5 flex-1 [&>div]:gradient-primary" />
                      <span className="text-xs font-medium">{Math.round(a.confidence * 100)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              variant={page === i + 1 ? "gradient" : "outline"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedAnalysis} onOpenChange={() => setSelectedAnalysis(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedAnalysis && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">Analysis Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Patient</p>
                    <p className="text-sm font-medium">Patient {selectedAnalysis.id.substring(0, 4)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-medium">{format(new Date(selectedAnalysis.timestamp), "MMM d, yyyy HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Top Prediction</p>
                    <p className="text-sm font-medium text-primary">{selectedAnalysis.top_prediction?.name || "Healthy"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="text-sm font-medium">{Math.round(selectedAnalysis.confidence * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    {statusBadge(selectedAnalysis.status)}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Filename</p>
                    <p className="text-sm font-medium truncate" title={selectedAnalysis.filename}>{selectedAnalysis.filename}</p>
                  </div>
                </div>

                {selectedAnalysis.top_prediction && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm bg-muted p-3 rounded-md leading-relaxed">{selectedAnalysis.top_prediction.description}</p>
                  </div>
                )}

                {selectedAnalysis.predictions && selectedAnalysis.predictions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground mb-1">All Predictions</p>
                    <div className="space-y-1.5">
                      {selectedAnalysis.predictions.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm bg-muted/50 px-3 py-2 rounded-md">
                          <span className="font-medium">{p.name}</span>
                          <Badge variant="secondary">{Math.round(p.confidence * 100)}%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
