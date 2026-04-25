import { motion } from "framer-motion";
import { Upload, ScanEye, CheckCircle2, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { mockStats, mockRecentActivity, mockChartData, mockUser } from "@/lib/mock-data";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function DashboardHome() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Welcome back, {mockUser.fullName.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">Here's your retinal analysis overview</p>
      </motion.div>

      {/* Quick upload CTA */}
      <motion.div variants={item}>
        <Card className="gradient-primary border-0 overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-heading font-bold text-primary-foreground">
                Start a New Analysis
              </h2>
              <p className="text-primary-foreground/80 text-sm max-w-md">
                Upload a retinal scan image to get instant AI-powered disease detection and recommendations.
              </p>
              <Button variant="secondary" className="mt-2" asChild>
                <Link to="/dashboard/upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="hidden sm:block">
              <div className="h-24 w-24 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                <ScanEye className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Scans" value={mockStats.totalScans.toLocaleString()} icon={ScanEye} trend={{ value: 12, positive: true }} />
        <StatCard title="Pending" value={mockStats.pendingAnalyses} icon={Clock} subtitle="Awaiting analysis" />
        <StatCard title="Completed" value={mockStats.completedAnalyses.toLocaleString()} icon={CheckCircle2} trend={{ value: 8, positive: true }} />
        <StatCard title="Detection Rate" value={`${mockStats.detectionRate}%`} icon={TrendingUp} trend={{ value: 2.1, positive: true }} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent activity */}
        <motion.div variants={item} className="lg:col-span-3">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-heading">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockRecentActivity.map((act) => (
                <div key={act.id} className="flex items-start gap-3">
                  <div
                    className={`h-2 w-2 rounded-full mt-2 shrink-0 ${
                      act.type === "success" ? "bg-green-500" : act.type === "warning" ? "bg-ocusight-orange" : "bg-primary"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{act.action}</p>
                    <p className="text-xs text-muted-foreground truncate">{act.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">{act.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Disease distribution mini chart */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="shadow-card h-full">
            <CardHeader>
              <CardTitle className="text-base font-heading">Disease Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockChartData.diseaseDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="hsl(0 0% 100%)"
                    >
                      {mockChartData.diseaseDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {mockChartData.diseaseDistribution.slice(0, 4).map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                    <span className="text-muted-foreground truncate">{d.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
