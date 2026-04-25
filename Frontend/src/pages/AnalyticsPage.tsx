import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, ScanEye, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";

const periods = ["7 days", "30 days", "3 months", "12 months"] as const;

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface AnalyticsData {
  total_scans: number;
  total_patients: number;
  avg_confidence: number;
  detection_rate: number;
  disease_distribution: Array<{ name: string; value: number }>;
  monthly_uploads: Array<{ month: string; uploads: number }>;
  confidence_trend: Array<{ month: string; avg: number }>;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<(typeof periods)[number]>("12 months");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch(`http://localhost:8000/analytics?period=${encodeURIComponent(period)}`)
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch((err) => console.error("Error fetching analytics:", err));
  }, [period]);

  const totalScans = analytics?.total_scans ?? 0;
  const totalPatients = analytics?.total_patients ?? 0;
  const avgConfidence = analytics ? (analytics.avg_confidence * 100).toFixed(1) + "%" : "0.0%";
  const detectionRate = analytics ? (analytics.detection_rate * 100).toFixed(1) + "%" : "0.0%";

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];
  const diseaseDistribution = (analytics?.disease_distribution ?? []).map((d, index) => ({
    ...d,
    fill: COLORS[index % COLORS.length]
  }));
  const monthlyUploads = analytics?.monthly_uploads ?? [];
  const confidenceTrend = analytics?.confidence_trend ?? [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Insights and trends from your analyses</p>
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {periods.map((p) => (
            <Button
              key={p}
              variant={period === p ? "gradient" : "ghost"}
              size="sm"
              className="text-xs"
              onClick={() => setPeriod(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Patients" value={totalPatients.toLocaleString()} icon={Users} trend={{ value: 15, positive: true }} />
        <StatCard title="Total Scans" value={totalScans.toLocaleString()} icon={ScanEye} trend={{ value: 12, positive: true }} />
        <StatCard title="Avg Confidence" value={avgConfidence} icon={TrendingUp} trend={{ value: 3.2, positive: true }} />
        <StatCard title="Detection Rate" value={detectionRate} icon={Activity} trend={{ value: 1.8, positive: true }} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disease distribution */}
        <motion.div variants={item}>
          <Card className="shadow-card h-full">
            <CardHeader>
              <CardTitle className="text-base font-heading">Disease Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={diseaseDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="hsl(0 0% 100%)"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {diseaseDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly uploads */}
        <motion.div variants={item}>
          <Card className="shadow-card h-full">
            <CardHeader>
              <CardTitle className="text-base font-heading">Monthly Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyUploads}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="uploads" fill="hsl(18, 100%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Confidence trend */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-heading">AI Confidence Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={confidenceTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avg"
                      name="Avg Confidence %"
                      stroke="hsl(18, 100%, 60%)"
                      strokeWidth={2}
                      dot={{ fill: "hsl(0, 84%, 60%)", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
