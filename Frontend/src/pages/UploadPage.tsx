import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileImage, X, Loader2, CheckCircle2, AlertTriangle, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

// ── Result shape stored in state ─────────────────────────────────────────────

interface FormattedResult {
  status: string;
  confidence: number;
  severity?: "high" | "medium" | "low";
  top?: { name: string; description: string; code: string; confidence: number };
  list?: Array<{ name: string; description: string; code: string; confidence: number }>;
  message?: string;
  advice?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FormattedResult | null>(null);

  // ── Dropzone ──────────────────────────────────────────────────────────────
  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  // ── Analyze ───────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!file) {
      alert("Please upload an image first.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail ?? `Server error ${response.status}`);
      }

      const data = await response.json();

      setResult({
        status: data.status,
        confidence: Math.round((data.confidence || 0) * 100),
        severity: data.severity,
        top: data.top_prediction,
        list: data.predictions,
        message: data.message,
        advice: data.advice
      });
      toast.success("Analysis complete!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect to backend.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Status styling helpers ────────────────────────────────────────────────
  const isDisease = result?.status === "Disease Detected";
  const isHealthy = result?.status === "Healthy";
  const isLowRisk = result?.status === "Low Risk";

  const statusColor   = isDisease ? "text-red-500"     : isHealthy ? "text-emerald-500" : "text-yellow-500";
  const borderColor   = isDisease ? "border-t-red-500" : isHealthy ? "border-t-emerald-500" : "border-t-yellow-500";
  const progressColor = isDisease ? "[&>div]:bg-red-500" : isHealthy ? "[&>div]:bg-emerald-500" : "[&>div]:bg-yellow-500";

  const StatusIcon = isHealthy
    ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    : <AlertTriangle className={`h-5 w-5 ${isDisease ? "text-red-500" : "text-yellow-500"}`} />;

  // ── Severity badge helpers ────────────────────────────────────────────────
  const severityConfig = {
    high:   { label: "High Severity",   classes: "bg-red-100 text-red-700 border-red-300" },
    medium: { label: "Medium Severity", classes: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    low:    { label: "Low Severity",    classes: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  };
  const severityBadge = result?.severity ? severityConfig[result.severity] : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Upload &amp; Analyze</h1>
        <p className="text-muted-foreground">Upload a retinal scan image for AI-powered disease detection</p>
      </div>

      {/* Upload card */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-accent"
                  : "border-ocusight-warm-border hover:border-primary"
              }`}
            >
              <input {...getInputProps()} />
              <div className="h-16 w-16 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-accent-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {isDragActive ? "Drop the image here" : "Drag & drop a retinal image"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or <span className="text-destructive font-medium">click to browse</span>
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Badge variant="secondary" className="text-xs">JPEG</Badge>
                <Badge variant="secondary" className="text-xs">PNG</Badge>
                <Badge variant="secondary" className="text-xs">Max 10 MB</Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-muted">
                <img src={preview!} alt="Retinal scan preview" className="w-full h-72 object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={clearFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileImage className="h-4 w-4" />
                <span className="truncate">{file.name}</span>
                <span className="ml-auto">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analyze button */}
      <Button
        variant="gradient"
        className="w-full h-12 text-base"
        disabled={!file || loading}
        onClick={handleAnalyze}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Analyze Image <ArrowRight className="h-5 w-5" />
          </span>
        )}
      </Button>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-heading font-bold text-foreground">Analysis Results</h2>

            <Card className={`shadow-card border-t-4 ${borderColor}`}>
              <CardContent className="p-6 space-y-5">

                {/* Row 1 — Status badge + Confidence */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {StatusIcon}
                      <span className={`font-heading font-bold text-lg ${statusColor}`}>
                        {result.status}
                      </span>
                    </div>
                    {/* Severity badge */}
                    {severityBadge && (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${severityBadge.classes}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {severityBadge.label}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Confidence</p>
                    <p className="text-4xl font-heading font-bold text-foreground leading-none mt-1">
                      {result.confidence}%
                    </p>
                  </div>
                </div>

                {/* Confidence progress bar */}
                <Progress value={result.confidence} className={`h-2 ${progressColor}`} />

                {/* IF Disease */}
                {isDisease && result.top && (
                  <div className="space-y-2 mt-4">
                    <h3 className="font-semibold text-lg">Top Disease: {result.top.name}</h3>
                    <p className="text-sm text-muted-foreground">{result.top.description}</p>
                  </div>
                )}

                {/* IF Healthy */}
                {(isHealthy || isLowRisk) && result.message && (
                  <div className="rounded-lg bg-muted px-4 py-3 mt-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {result.message}
                    </p>
                  </div>
                )}

                {/* Show list */}
                {result.list && result.list.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2">Possible Conditions:</h4>
                    <ul className="space-y-2">
                      {result.list.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
                          <span className="text-sm font-medium">{item.name}</span>
                          <Badge variant="secondary">{Math.round(item.confidence * 100)}%</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Suggestions */}
                {result.advice && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-blue-100/70 border-b border-blue-200">
                      <svg className="h-4 w-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 8v4l3 3"/><circle cx="18" cy="6" r="3"/></svg>
                      <h3 className="text-sm font-bold text-blue-800 tracking-wide">AI-Generated Suggestions</h3>
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">Gemini</span>
                    </div>
                    <p className="px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {result.advice}
                    </p>
                  </div>
                )}

              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
