export const mockUser = {
  id: "1",
  fullName: "Dr. Sarah Chen",
  email: "sarah.chen@ocusight.com",
  role: "doctor" as const,
  avatar: null,
};

export const mockStats = {
  totalScans: 1248,
  pendingAnalyses: 12,
  completedAnalyses: 1236,
  detectionRate: 94.2,
};

export const mockDiseases = [
  "Diabetic Retinopathy",
  "Age-related Macular Degeneration",
  "Glaucoma",
  "Retinal Vein Occlusion",
  "Cataract",
  "Normal",
];

export const mockAnalyses = Array.from({ length: 25 }, (_, i) => {
  const disease = mockDiseases[Math.floor(Math.random() * mockDiseases.length)];
  const confidence = 0.65 + Math.random() * 0.33;
  const statuses = ["completed", "pending", "processing"] as const;
  const status = i < 20 ? statuses[0] : statuses[Math.floor(Math.random() * 3)];
  const daysAgo = Math.floor(Math.random() * 60);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return {
    id: `AN-${String(1000 + i).padStart(4, "0")}`,
    patientName: [
      "James Wilson", "Maria Garcia", "Ahmed Hassan", "Emily Brown",
      "Chen Wei", "Priya Sharma", "John Smith", "Anna Kowalski",
      "David Kim", "Fatima Al-Rashid", "Robert Taylor", "Lisa Chang",
    ][i % 12],
    patientId: `PT-${String(2000 + i).padStart(4, "0")}`,
    uploadDate: date.toISOString(),
    primaryPrediction: disease,
    confidence: Math.round(confidence * 100) / 100,
    status,
    severity: disease === "Normal" ? null : (["mild", "moderate", "severe"] as const)[Math.floor(Math.random() * 3)],
  };
});

export const mockRecentActivity = [
  { id: 1, action: "Analysis completed", detail: "Diabetic Retinopathy detected for James Wilson", time: "2 min ago", type: "success" as const },
  { id: 2, action: "New scan uploaded", detail: "Retinal image for Maria Garcia", time: "15 min ago", type: "info" as const },
  { id: 3, action: "Report generated", detail: "PDF report for Ahmed Hassan", time: "1 hour ago", type: "info" as const },
  { id: 4, action: "Follow-up scheduled", detail: "Emily Brown - Glaucoma review", time: "3 hours ago", type: "warning" as const },
  { id: 5, action: "Analysis completed", detail: "Normal result for Chen Wei", time: "5 hours ago", type: "success" as const },
];

export const mockChartData = {
  diseaseDistribution: [
    { name: "Diabetic Retinopathy", value: 340, fill: "hsl(18, 100%, 60%)" },
    { name: "AMD", value: 280, fill: "hsl(0, 84%, 60%)" },
    { name: "Glaucoma", value: 220, fill: "hsl(30, 90%, 55%)" },
    { name: "RVO", value: 150, fill: "hsl(10, 80%, 70%)" },
    { name: "Cataract", value: 120, fill: "hsl(25, 70%, 75%)" },
    { name: "Normal", value: 138, fill: "hsl(220, 9%, 70%)" },
  ],
  monthlyUploads: [
    { month: "Jan", uploads: 85 },
    { month: "Feb", uploads: 92 },
    { month: "Mar", uploads: 110 },
    { month: "Apr", uploads: 98 },
    { month: "May", uploads: 130 },
    { month: "Jun", uploads: 145 },
    { month: "Jul", uploads: 120 },
    { month: "Aug", uploads: 155 },
    { month: "Sep", uploads: 140 },
    { month: "Oct", uploads: 165 },
    { month: "Nov", uploads: 170 },
    { month: "Dec", uploads: 138 },
  ],
  confidenceTrend: [
    { month: "Jan", avg: 88 },
    { month: "Feb", avg: 89 },
    { month: "Mar", avg: 90 },
    { month: "Apr", avg: 91 },
    { month: "May", avg: 89 },
    { month: "Jun", avg: 92 },
    { month: "Jul", avg: 93 },
    { month: "Aug", avg: 91 },
    { month: "Sep", avg: 94 },
    { month: "Oct", avg: 93 },
    { month: "Nov", avg: 95 },
    { month: "Dec", avg: 94 },
  ],
};

export function generateMockAnalysis(disease?: string) {
  const selected = disease || mockDiseases[Math.floor(Math.random() * mockDiseases.length)];
  const confidence = 0.70 + Math.random() * 0.28;

  const allPredictions = mockDiseases.map((d) => ({
    disease: d,
    probability: d === selected ? confidence : Math.random() * (1 - confidence) * 0.5,
    severity: d === "Normal" ? undefined : (["mild", "moderate", "severe"] as const)[Math.floor(Math.random() * 3)],
  })).sort((a, b) => b.probability - a.probability);

  const recommendations: Record<string, { remedies: string[]; precautions: string[]; doctorVisit: string }> = {
    "Diabetic Retinopathy": {
      remedies: ["Strict glycemic control (HbA1c < 7%)", "Anti-VEGF injections as prescribed", "Regular eye examinations every 3-6 months"],
      precautions: ["Monitor blood glucose levels daily", "Control blood pressure (<130/80 mmHg)", "Annual comprehensive eye exam with dilation"],
      doctorVisit: "Within 1 week for confirmatory OCT",
    },
    "Age-related Macular Degeneration": {
      remedies: ["AREDS2 supplement formula", "Anti-VEGF therapy for wet AMD", "Low vision rehabilitation if needed"],
      precautions: ["Use Amsler grid for daily self-monitoring", "Wear UV-protective sunglasses", "Maintain healthy diet rich in leafy greens"],
      doctorVisit: "Within 2 weeks for OCT and fluorescein angiography",
    },
    "Glaucoma": {
      remedies: ["Prostaglandin analog eye drops", "Beta-blocker eye drops if needed", "Consider laser trabeculoplasty"],
      precautions: ["Use eye drops at same time daily", "Regular IOP monitoring", "Avoid heavy lifting that increases eye pressure"],
      doctorVisit: "Within 1 week for visual field test and IOP measurement",
    },
  };

  return {
    primaryPrediction: selected,
    confidence: Math.round(confidence * 100) / 100,
    allPredictions,
    recommendations: recommendations[selected] || {
      remedies: ["Consult with ophthalmologist for personalized treatment plan"],
      precautions: ["Regular eye checkups recommended every 6-12 months"],
      doctorVisit: "Schedule appointment within 2 weeks",
    },
  };
}
