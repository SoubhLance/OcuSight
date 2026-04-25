import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileImage, X, Loader2, CheckCircle2,
  AlertTriangle, ArrowRight, Download, Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { generateMockAnalysis } from "@/lib/mock-data";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { toast } from "sonner";

type AnalysisResult = ReturnType<typeof generateMockAnalysis>;

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [threshold, setThreshold] = useState([70]);
  const [detectDisease, setDetectDisease] = useState(true);
  const [assessSeverity, setAssessSeverity] = useState(true);

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

  const handleAnalyze = () => {
    if (!file) return;
    setAnalyzing(true);
    setTimeout(() => {
      setResult(generateMockAnalysis());
      setAnalyzing(false);
      toast.success("Analysis complete!");
    }, 3000);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  const severityColor = (s?: string) =>
    s === "severe" ? "text-destructive" : s === "moderate" ? "text-ocusight-orange" : "text-yellow-600";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Upload & Analyze</h1>
        <p className="text-muted-foreground">Upload a retinal scan image for AI-powered analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Upload section */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="shadow-card">
            <CardContent className="p-6">
              {!file ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-primary bg-accent" : "border-ocusight-warm-border hover:border-primary"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="h-14 w-14 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-7 w-7 text-accent-foreground" />
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
                    <Badge variant="secondary" className="text-xs">Max 10MB</Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-muted">
                    <img src={preview!} alt="Retinal scan" className="w-full h-64 object-cover" />
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

          {/* Patient info */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-sm font-heading">Patient Information (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Patient ID</Label>
                  <Input placeholder="Auto-generated" className="h-9 text-sm focus-visible:ring-primary" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Age</Label>
                  <Input type="number" placeholder="e.g. 55" className="h-9 text-sm focus-visible:ring-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Clinical Notes</Label>
                <Textarea placeholder="Add any relevant notes..." className="text-sm min-h-[60px] focus-visible:ring-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis options */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-sm font-heading">Analysis Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Disease Detection</Label>
                <Switch checked={detectDisease} onCheckedChange={setDetectDisease} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Severity Assessment</Label>
                <Switch checked={assessSeverity} onCheckedChange={setAssessSeverity} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Confidence Threshold</Label>
                  <span className="text-sm font-medium text-primary">{threshold[0]}%</span>
                </div>
                <Slider
                  value={threshold}
                  onValueChange={setThreshold}
                  min={50}
                  max={95}
                  step={5}
                  className="[&_[role=slider]]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            variant="gradient"
            className="w-full h-12 text-base"
            disabled={!file || analyzing}
            onClick={handleAnalyze}
          >
            {analyzing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Analyze Image <ArrowRight className="h-5 w-5" />
              </span>
            )}
          </Button>
        </div>
      </div>

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Primary result */}
              <Card className="shadow-card border-t-4 border-t-primary">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Primary Prediction</p>
                      <h3 className="text-xl font-heading font-bold text-primary">{result.primaryPrediction}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="text-2xl font-heading font-bold text-foreground">
                        {Math.round(result.confidence * 100)}%
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={result.confidence * 100}
                    className="h-2 [&>div]:gradient-primary"
                  />
                  {result.allPredictions[0].severity && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 ${severityColor(result.allPredictions[0].severity)}`} />
                      <span className={`text-sm font-medium capitalize ${severityColor(result.allPredictions[0].severity)}`}>
                        {result.allPredictions[0].severity} severity
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline-destructive" size="sm">
                      <Download className="h-4 w-4 mr-1" /> Report
                    </Button>
                    <Button variant="outline-primary" size="sm">
                      <Share2 className="h-4 w-4 mr-1" /> Share
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Probability chart */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-sm font-heading">Probability Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.allPredictions.slice(0, 5)} layout="vertical">
                        <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                        <YAxis type="category" dataKey="disease" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => `${Math.round(v * 100)}%`} />
                        <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
                          {result.allPredictions.slice(0, 5).map((_, i) => (
                            <Cell key={i} fill={i === 0 ? "hsl(18, 100%, 60%)" : "hsl(0, 84%, 60%)"} opacity={1 - i * 0.15} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-sm font-heading font-semibold text-foreground">Remedies</h4>
                    <ul className="space-y-1.5">
                      {result.recommendations.remedies.map((r, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-heading font-semibold text-foreground">Precautions</h4>
                    <ul className="space-y-1.5">
                      {result.recommendations.precautions.map((p, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-heading font-semibold text-foreground">Doctor Visit</h4>
                    <p className="text-sm text-muted-foreground">{result.recommendations.doctorVisit}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
