import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Lock, Bell, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { mockUser } from "@/lib/mock-data";
import { toast } from "sonner";

export default function ProfilePage() {
  const [name, setName] = useState(mockUser.fullName);
  const [email] = useState(mockUser.email);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-3xl"
    >
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile info */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {mockUser.fullName.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline-primary" size="sm">Change Avatar</Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="focus-visible:ring-primary" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={email} disabled className="pl-10 bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="+1 (555) 000-0000" className="pl-10 focus-visible:ring-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value="Doctor" disabled className="bg-muted capitalize" />
            </div>
          </div>
          <Button variant="gradient" onClick={() => toast.success("Profile updated!")}>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input type="password" placeholder="••••••••" className="focus-visible:ring-primary" />
            </div>
            <div />
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" placeholder="••••••••" className="focus-visible:ring-primary" />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input type="password" placeholder="••••••••" className="focus-visible:ring-primary" />
            </div>
          </div>
          <Button variant="outline-primary" onClick={() => toast.success("Password updated!")}>Change Password</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Analysis completed", desc: "Get notified when an analysis finishes" },
            { label: "New patient registration", desc: "Alerts for new patient signups" },
            { label: "Weekly summary", desc: "Receive a weekly email report" },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Switch />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Clinic info */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Clinic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Institution Name</Label>
              <Input placeholder="City Eye Hospital" className="focus-visible:ring-primary" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input placeholder="Ophthalmology" className="focus-visible:ring-primary" />
            </div>
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input placeholder="MED-XXXX-XXXX" className="focus-visible:ring-primary" />
            </div>
            <div className="space-y-2">
              <Label>Specialization</Label>
              <Input placeholder="Retinal Surgery" className="focus-visible:ring-primary" />
            </div>
          </div>
          <Button variant="gradient" onClick={() => toast.success("Clinic info saved!")}>Save Clinic Info</Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
