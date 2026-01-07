import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CloudUpload, Server, Database } from "lucide-react";

export default function ImportPage() {
  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Data Import</h1>
        <p className="text-muted-foreground">Configure external data sources and automated imports.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              FTP/SFTP Configuration
            </CardTitle>
            <CardDescription>
              Connect to an external file server to automatically ingest meter data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <RadioGroup defaultValue="sftp" className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ftp" id="ftp" />
                  <Label htmlFor="ftp">FTP</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sftp" id="sftp" />
                  <Label htmlFor="sftp">SFTP (Secure)</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">Host Address</Label>
                <Input id="host" placeholder="ftp.example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input id="port" placeholder="22" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="user_123" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password / Private Key</Label>
              <Input id="password" type="password" placeholder="••••••••••••" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="path">Remote Path</Label>
              <Input id="path" placeholder="/data/meter_readings/" />
            </div>

            <Button className="w-full">
              <Database className="mr-2 h-4 w-4" />
              Test Connection & Save
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
               <CloudUpload className="h-5 w-5 text-primary" />
               Manual Upload
            </CardTitle>
            <CardDescription>
              Upload CSV or Excel files directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:bg-muted/50 transition-colors cursor-pointer">
              <CloudUpload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">Drag files here</h3>
              <p className="text-sm text-muted-foreground mb-4">or click to browse from your computer</p>
              <Button variant="secondary">Select Files</Button>
            </div>
            
            <div className="mt-6">
              <h4 className="font-medium mb-3">Recent Imports</h4>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-md bg-card">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center">
                        <FileTextIcon />
                      </div>
                      <div>
                        <div className="font-medium text-sm">meter_data_2024_0{i}.csv</div>
                        <div className="text-xs text-muted-foreground">Imported today at 10:0{i} AM</div>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded-full">Success</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function FileTextIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-green-600 dark:text-green-400"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 18v-6" />
      <path d="m9 15 3 3 3-3" />
    </svg>
  )
}