import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CloudUpload, FileText, Upload, CheckCircle, AlertCircle, Clock, Loader2, X, Server, Plus, Wifi, WifiOff, Download, Trash2, RefreshCw, FolderOpen, Eye, EyeOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useCallback } from "react";

interface PreviewData {
  filename: string;
  format: string;
  totalRows: number;
  metersMatched: number;
  meters: {
    id: number;
    mpan: string | null;
    meterSerial: string | null;
    siteId: number;
    rowCount: number;
    dateRange: { min: string; max: string };
  }[];
  unmatchedMpans: string[];
  sampleRows: {
    mpan: string;
    meterSerial: string;
    date: string;
    dayTotal: number;
    matched: boolean;
    meterId: number | null;
  }[];
}

interface ImportResult {
  id: number;
  status: string;
  imported: number;
  skipped: number;
  errors: number;
  errorDetails?: string[];
}

interface ImportLogEntry {
  id: number;
  filename: string;
  format: string;
  status: string;
  totalRows: number | null;
  importedRows: number | null;
  skippedRows: number | null;
  errorRows: number | null;
  createdAt: string;
}

interface SftpConfig {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  remoteDirectory: string;
  filePattern: string | null;
  isActive: boolean;
  hasPassword: boolean;
  hasPrivateKey: boolean;
  lastConnected: string | null;
  lastDownload: string | null;
  lastError: string | null;
  createdAt: string;
}

interface RemoteFile {
  name: string;
  size: number;
  modifyTime: number;
  alreadyDownloaded: boolean;
}

interface SftpDownloadLog {
  id: number;
  sftpConfigId: number;
  filename: string;
  fileSize: number | null;
  status: string;
  importLogId: number | null;
  downloadedAt: string;
  processedAt: string | null;
  errorDetails: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddSftp, setShowAddSftp] = useState(false);
  const [editingSftp, setEditingSftp] = useState<SftpConfig | null>(null);
  const [sftpForm, setSftpForm] = useState({ name: "", host: "", port: "22", username: "", password: "", remoteDirectory: "/", filePattern: "*.csv" });
  const [showPassword, setShowPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ configId: number; success: boolean; message: string } | null>(null);
  const [browsingFiles, setBrowsingFiles] = useState<number | null>(null);
  const [remoteFiles, setRemoteFiles] = useState<RemoteFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [downloadResult, setDownloadResult] = useState<{ filename: string; status: string; imported: number; skipped: number; errors: number } | null>(null);

  const { data: importLogs, refetch: refetchLogs } = useQuery<ImportLogEntry[]>({
    queryKey: ["/api/import/logs"],
  });

  const { data: sftpConfigs, refetch: refetchSftp } = useQuery<SftpConfig[]>({
    queryKey: ["/api/sftp/configs"],
  });

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setPreview(null);
    setResult(null);
    setPreviewing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/profile/preview", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Preview failed");
      }

      const data = await res.json();
      setPreview(data);
    } catch (err: any) {
      alert("Error previewing file: " + err.message);
      setSelectedFile(null);
    } finally {
      setPreviewing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".txt"))) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/import/profile/execute", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Import failed");
      }

      const data = await res.json();
      setResult(data);
      refetchLogs();
    } catch (err: any) {
      alert("Import error: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetSftpForm = () => {
    setSftpForm({ name: "", host: "", port: "22", username: "", password: "", remoteDirectory: "/", filePattern: "*.csv" });
    setShowPassword(false);
  };

  const handleAddSftp = async () => {
    try {
      const res = await fetch("/api/sftp/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: sftpForm.name,
          host: sftpForm.host,
          port: parseInt(sftpForm.port) || 22,
          username: sftpForm.username,
          password: sftpForm.password || null,
          remoteDirectory: sftpForm.remoteDirectory || "/",
          filePattern: sftpForm.filePattern || "*.csv",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setShowAddSftp(false);
      resetSftpForm();
      refetchSftp();
    } catch (err: any) {
      alert("Error adding SFTP connection: " + err.message);
    }
  };

  const handleUpdateSftp = async () => {
    if (!editingSftp) return;
    try {
      const body: any = {
        name: sftpForm.name,
        host: sftpForm.host,
        port: parseInt(sftpForm.port) || 22,
        username: sftpForm.username,
        remoteDirectory: sftpForm.remoteDirectory || "/",
        filePattern: sftpForm.filePattern || "*.csv",
      };
      if (sftpForm.password) body.password = sftpForm.password;
      const res = await fetch(`/api/sftp/configs/${editingSftp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setEditingSftp(null);
      resetSftpForm();
      refetchSftp();
    } catch (err: any) {
      alert("Error updating SFTP connection: " + err.message);
    }
  };

  const handleDeleteSftp = async (id: number) => {
    if (!confirm("Are you sure you want to delete this SFTP connection?")) return;
    try {
      await fetch(`/api/sftp/configs/${id}`, { method: "DELETE", credentials: "include" });
      refetchSftp();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleTestConnection = async (id: number) => {
    setTestingConnection(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/sftp/configs/${id}/test`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      setTestResult({ configId: id, success: data.success, message: data.message });
      refetchSftp();
    } catch (err: any) {
      setTestResult({ configId: id, success: false, message: err.message });
    } finally {
      setTestingConnection(null);
    }
  };

  const handleBrowseFiles = async (id: number) => {
    setBrowsingFiles(id);
    setRemoteFiles([]);
    setLoadingFiles(true);
    setDownloadResult(null);
    try {
      const res = await fetch(`/api/sftp/configs/${id}/list-files`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      const data = await res.json();
      setRemoteFiles(data);
    } catch (err: any) {
      alert("Error listing files: " + err.message);
      setBrowsingFiles(null);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDownloadFile = async (configId: number, filename: string) => {
    setDownloadingFile(filename);
    setDownloadResult(null);
    try {
      const res = await fetch(`/api/sftp/configs/${configId}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ filename }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      const data = await res.json();
      setDownloadResult(data);
      refetchLogs();
      handleBrowseFiles(configId);
    } catch (err: any) {
      alert("Download error: " + err.message);
    } finally {
      setDownloadingFile(null);
    }
  };

  const openEditSftp = (config: SftpConfig) => {
    setSftpForm({
      name: config.name,
      host: config.host,
      port: String(config.port),
      username: config.username,
      password: "",
      remoteDirectory: config.remoteDirectory,
      filePattern: config.filePattern || "*.csv",
    });
    setEditingSftp(config);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Data Import</h1>
        <p className="text-muted-foreground">Upload half-hourly profile data from CSV files or download via SFTP.</p>
      </div>

      <Tabs defaultValue="sftp" className="w-full">
        <TabsList>
          <TabsTrigger value="sftp" data-testid="tab-sftp">
            <Server className="h-4 w-4 mr-2" />
            SFTP Downloads
          </TabsTrigger>
          <TabsTrigger value="upload" data-testid="tab-upload">
            <Upload className="h-4 w-4 mr-2" />
            Manual Upload
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <Clock className="h-4 w-4 mr-2" />
            Import History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sftp" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">SFTP Connections</h2>
                <p className="text-sm text-muted-foreground">Connect to external SFTP servers to download profile data files.</p>
              </div>
              <Button onClick={() => { resetSftpForm(); setShowAddSftp(true); }} data-testid="button-add-sftp">
                <Plus className="h-4 w-4 mr-2" />
                Add Connection
              </Button>
            </div>

            {sftpConfigs && sftpConfigs.length > 0 ? (
              <div className="space-y-4">
                {sftpConfigs.map((config) => (
                  <Card key={config.id} data-testid={`card-sftp-${config.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${config.lastError ? "bg-red-100 dark:bg-red-950" : config.lastConnected ? "bg-green-100 dark:bg-green-950" : "bg-muted"}`}>
                            {config.lastError ? (
                              <WifiOff className="h-5 w-5 text-red-600" />
                            ) : config.lastConnected ? (
                              <Wifi className="h-5 w-5 text-green-600" />
                            ) : (
                              <Server className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-base">{config.name}</CardTitle>
                            <CardDescription className="font-mono text-xs">
                              {config.username}@{config.host}:{config.port}{config.remoteDirectory}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={config.isActive ? "default" : "secondary"} className="text-xs">
                            {config.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Last Connected</p>
                          <p className="font-medium text-sm">{formatDate(config.lastConnected)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Last Download</p>
                          <p className="font-medium text-sm">{formatDate(config.lastDownload)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">File Pattern</p>
                          <p className="font-medium text-sm font-mono">{config.filePattern || "*.csv"}</p>
                        </div>
                      </div>

                      {config.lastError && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 rounded-md">
                          <p className="text-sm text-red-600 font-medium">Last Error</p>
                          <p className="text-xs text-red-500 mt-1">{config.lastError}</p>
                        </div>
                      )}

                      {testResult && testResult.configId === config.id && (
                        <div className={`mb-4 p-3 rounded-md ${testResult.success ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}>
                          <div className="flex items-center gap-2">
                            {testResult.success ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                            <p className={`text-sm ${testResult.success ? "text-green-700" : "text-red-700"}`}>{testResult.message}</p>
                          </div>
                        </div>
                      )}

                      {browsingFiles === config.id && (
                        <div className="mb-4">
                          <Separator className="mb-4" />
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-sm">Remote Files</h4>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleBrowseFiles(config.id)} data-testid="button-refresh-files">
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setBrowsingFiles(null); setDownloadResult(null); }} data-testid="button-close-files">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {downloadResult && (
                            <div className={`mb-3 p-3 rounded-md ${downloadResult.status === "completed" ? "bg-green-50 dark:bg-green-950" : "bg-orange-50 dark:bg-orange-950"}`}>
                              <div className="flex items-center gap-2 mb-1">
                                {downloadResult.status === "completed" ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-orange-600" />
                                )}
                                <p className="text-sm font-medium">{downloadResult.filename}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {downloadResult.imported} imported, {downloadResult.skipped} skipped, {downloadResult.errors} errors
                              </p>
                            </div>
                          )}

                          {loadingFiles ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <span className="ml-2 text-sm text-muted-foreground">Connecting...</span>
                            </div>
                          ) : remoteFiles.length > 0 ? (
                            <div className="border rounded-md overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                  <tr>
                                    <th className="text-left p-2 font-medium">Filename</th>
                                    <th className="text-right p-2 font-medium">Size</th>
                                    <th className="text-left p-2 font-medium">Modified</th>
                                    <th className="text-right p-2 font-medium">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {remoteFiles.map((file) => (
                                    <tr key={file.name} className="border-t" data-testid={`row-remote-file-${file.name}`}>
                                      <td className="p-2">
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-muted-foreground" />
                                          <span className="font-mono text-xs">{file.name}</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-right text-xs">{formatBytes(file.size)}</td>
                                      <td className="p-2 text-xs">
                                        {file.modifyTime ? new Date(file.modifyTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                                      </td>
                                      <td className="p-2 text-right">
                                        {file.alreadyDownloaded ? (
                                          <Badge variant="outline" className="text-xs text-green-600">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Downloaded
                                          </Badge>
                                        ) : downloadingFile === file.name ? (
                                          <Button size="sm" variant="ghost" disabled>
                                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                            Downloading...
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDownloadFile(config.id, file.name)}
                                            data-testid={`button-download-${file.name}`}
                                          >
                                            <Download className="h-3 w-3 mr-1" />
                                            Download & Import
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No CSV/TXT files found in the remote directory.</p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(config.id)}
                          disabled={testingConnection === config.id}
                          data-testid={`button-test-${config.id}`}
                        >
                          {testingConnection === config.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Wifi className="h-4 w-4 mr-1" />
                          )}
                          Test Connection
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBrowseFiles(config.id)}
                          data-testid={`button-browse-${config.id}`}
                        >
                          <FolderOpen className="h-4 w-4 mr-1" />
                          Browse Files
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSftp(config)}
                          data-testid={`button-edit-sftp-${config.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteSftp(config.id)}
                          data-testid={`button-delete-sftp-${config.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No SFTP Connections</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add an SFTP connection to download profile data files from your data collector's server.
                  </p>
                  <Button onClick={() => { resetSftpForm(); setShowAddSftp(true); }} data-testid="button-add-sftp-empty">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Connection
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Upload Profile Data
                  </CardTitle>
                  <CardDescription>
                    Upload CSV files containing half-hourly electricity profile data (Format 18: MPAN, Meter ID, Type, Date, 48 x Value/Flag pairs).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!result ? (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt"
                        className="hidden"
                        data-testid="input-file-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                      />

                      <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                          dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        data-testid="dropzone-file"
                      >
                        {previewing ? (
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-10 w-10 text-primary animate-spin" />
                            <p className="text-sm text-muted-foreground">Analysing file...</p>
                          </div>
                        ) : selectedFile && preview ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-primary" />
                              <div className="text-left">
                                <p className="font-medium">{preview.filename}</p>
                                <p className="text-sm text-muted-foreground">{preview.format} &middot; {preview.totalRows} rows</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); resetForm(); }} data-testid="button-clear-file">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <CloudUpload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                            <h3 className="text-lg font-medium mb-1">Drag CSV file here</h3>
                            <p className="text-sm text-muted-foreground mb-3">or click to browse</p>
                            <Button variant="secondary" data-testid="button-select-files">Select File</Button>
                          </>
                        )}
                      </div>

                      {preview && (
                        <div className="mt-6 space-y-4">
                          <Separator />

                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-muted/50 rounded-lg">
                              <p className="text-2xl font-bold" data-testid="text-total-rows">{preview.totalRows}</p>
                              <p className="text-xs text-muted-foreground">Total Rows</p>
                            </div>
                            <div className="text-center p-3 bg-muted/50 rounded-lg">
                              <p className="text-2xl font-bold text-green-600" data-testid="text-meters-matched">{preview.metersMatched}</p>
                              <p className="text-xs text-muted-foreground">Meters Matched</p>
                            </div>
                            <div className="text-center p-3 bg-muted/50 rounded-lg">
                              <p className="text-2xl font-bold text-orange-500" data-testid="text-unmatched">{preview.unmatchedMpans.length}</p>
                              <p className="text-xs text-muted-foreground">Unmatched MPANs</p>
                            </div>
                          </div>

                          {preview.meters.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Matched Meters</h4>
                              <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-muted/50">
                                    <tr>
                                      <th className="text-left p-2 font-medium">MPAN / Meter</th>
                                      <th className="text-left p-2 font-medium">Rows</th>
                                      <th className="text-left p-2 font-medium">Date Range</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {preview.meters.map((m) => (
                                      <tr key={m.id} className="border-t" data-testid={`row-meter-${m.id}`}>
                                        <td className="p-2">
                                          <span className="font-mono text-xs">{m.mpan || m.meterSerial}</span>
                                        </td>
                                        <td className="p-2">{m.rowCount}</td>
                                        <td className="p-2 text-xs">{m.dateRange.min} to {m.dateRange.max}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {preview.unmatchedMpans.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2 text-orange-600">Unmatched MPANs</h4>
                              <p className="text-sm text-muted-foreground mb-2">
                                These MPANs were not found in the system. Their rows will be skipped during import.
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {preview.unmatchedMpans.map((mpan) => (
                                  <Badge key={mpan} variant="outline" className="font-mono text-xs" data-testid={`badge-unmatched-${mpan}`}>
                                    {mpan}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {preview.sampleRows.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Sample Data (first 5 rows)</h4>
                              <div className="border rounded-md overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-muted/50">
                                    <tr>
                                      <th className="text-left p-2 font-medium">MPAN</th>
                                      <th className="text-left p-2 font-medium">Meter Serial</th>
                                      <th className="text-left p-2 font-medium">Date</th>
                                      <th className="text-right p-2 font-medium">Day Total (kWh)</th>
                                      <th className="text-left p-2 font-medium">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {preview.sampleRows.map((row, idx) => (
                                      <tr key={idx} className="border-t">
                                        <td className="p-2 font-mono text-xs">{row.mpan}</td>
                                        <td className="p-2 font-mono text-xs">{row.meterSerial}</td>
                                        <td className="p-2">{row.date}</td>
                                        <td className="p-2 text-right">{row.dayTotal.toLocaleString()}</td>
                                        <td className="p-2">
                                          {row.matched ? (
                                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">Matched</Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-orange-600 text-xs">Unmatched</Badge>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-3 pt-2">
                            <Button
                              onClick={handleImport}
                              disabled={importing || preview.metersMatched === 0}
                              className="flex-1"
                              data-testid="button-import"
                            >
                              {importing ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Importing...
                                </>
                              ) : (
                                <>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Import {preview.totalRows} Rows
                                </>
                              )}
                            </Button>
                            <Button variant="outline" onClick={resetForm} disabled={importing} data-testid="button-cancel">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6">
                      {result.status === "completed" ? (
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      ) : (
                        <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                      )}

                      <h3 className="text-lg font-medium mb-1" data-testid="text-import-status">
                        {result.status === "completed" ? "Import Complete" : "Import Completed with Errors"}
                      </h3>

                      <div className="grid grid-cols-3 gap-4 mt-4 mb-4">
                        <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p className="text-xl font-bold text-green-600" data-testid="text-imported-count">{result.imported}</p>
                          <p className="text-xs text-muted-foreground">Imported</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-xl font-bold" data-testid="text-skipped-count">{result.skipped}</p>
                          <p className="text-xs text-muted-foreground">Skipped</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                          <p className="text-xl font-bold text-red-600" data-testid="text-error-count">{result.errors}</p>
                          <p className="text-xs text-muted-foreground">Errors</p>
                        </div>
                      </div>

                      {result.errorDetails && result.errorDetails.length > 0 && (
                        <div className="mt-4 text-left">
                          <h4 className="font-medium text-sm mb-2 text-red-600">Error Details</h4>
                          <div className="bg-red-50 dark:bg-red-950 p-3 rounded-md text-sm space-y-1">
                            {result.errorDetails.map((err, i) => (
                              <p key={i} className="text-red-700 dark:text-red-300 font-mono text-xs">{err}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button onClick={resetForm} className="mt-4" data-testid="button-upload-another">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Another File
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Supported Formats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">Format 18 - HH Profile</p>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">Active</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">MPAN, Meter ID, Elec kWh, Date, 48 x (kWh Value, Flag)</p>
                    </div>
                    <div className="p-3 border rounded-md opacity-50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">Gas HH Profile</p>
                        <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">MPRN-based gas half-hourly data</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Import History
              </CardTitle>
              <CardDescription>All profile data imports including manual uploads and SFTP downloads.</CardDescription>
            </CardHeader>
            <CardContent>
              {importLogs && importLogs.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Filename</th>
                        <th className="text-left p-3 font-medium">Format</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Imported</th>
                        <th className="text-right p-3 font-medium">Skipped</th>
                        <th className="text-right p-3 font-medium">Errors</th>
                        <th className="text-left p-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importLogs.map((log) => (
                        <tr key={log.id} className="border-t" data-testid={`row-import-log-${log.id}`}>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {log.filename.startsWith("[SFTP]") ? (
                                <Server className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Upload className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium text-sm truncate max-w-[200px]">{log.filename}</span>
                            </div>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{log.format}</td>
                          <td className="p-3">
                            {log.status === "completed" ? (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">Completed</Badge>
                            ) : log.status === "completed_with_errors" ? (
                              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 text-xs">With Errors</Badge>
                            ) : log.status === "processing" ? (
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs">Processing</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">{log.status}</Badge>
                            )}
                          </td>
                          <td className="p-3 text-right text-green-600 font-medium">{log.importedRows ?? 0}</td>
                          <td className="p-3 text-right text-muted-foreground">{log.skippedRows ?? 0}</td>
                          <td className="p-3 text-right text-red-500">{log.errorRows ?? 0}</td>
                          <td className="p-3 text-xs text-muted-foreground">{formatDate(log.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No imports yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddSftp || !!editingSftp} onOpenChange={(open) => { if (!open) { setShowAddSftp(false); setEditingSftp(null); resetSftpForm(); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSftp ? "Edit SFTP Connection" : "Add SFTP Connection"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sftp-name">Connection Name</Label>
              <Input
                id="sftp-name"
                placeholder="e.g., Stark Data Collector"
                value={sftpForm.name}
                onChange={(e) => setSftpForm({ ...sftpForm, name: e.target.value })}
                data-testid="input-sftp-name"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="sftp-host">Host / IP Address</Label>
                <Input
                  id="sftp-host"
                  placeholder="sftp.example.com"
                  value={sftpForm.host}
                  onChange={(e) => setSftpForm({ ...sftpForm, host: e.target.value })}
                  data-testid="input-sftp-host"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sftp-port">Port</Label>
                <Input
                  id="sftp-port"
                  placeholder="22"
                  value={sftpForm.port}
                  onChange={(e) => setSftpForm({ ...sftpForm, port: e.target.value })}
                  data-testid="input-sftp-port"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sftp-username">Username</Label>
              <Input
                id="sftp-username"
                placeholder="username"
                value={sftpForm.username}
                onChange={(e) => setSftpForm({ ...sftpForm, username: e.target.value })}
                data-testid="input-sftp-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sftp-password">Password</Label>
              <div className="relative">
                <Input
                  id="sftp-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={editingSftp ? "(leave blank to keep existing)" : "password"}
                  value={sftpForm.password}
                  onChange={(e) => setSftpForm({ ...sftpForm, password: e.target.value })}
                  data-testid="input-sftp-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sftp-dir">Remote Directory</Label>
              <Input
                id="sftp-dir"
                placeholder="/"
                value={sftpForm.remoteDirectory}
                onChange={(e) => setSftpForm({ ...sftpForm, remoteDirectory: e.target.value })}
                data-testid="input-sftp-directory"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sftp-pattern">File Pattern</Label>
              <Input
                id="sftp-pattern"
                placeholder="*.csv"
                value={sftpForm.filePattern}
                onChange={(e) => setSftpForm({ ...sftpForm, filePattern: e.target.value })}
                data-testid="input-sftp-pattern"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddSftp(false); setEditingSftp(null); resetSftpForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={editingSftp ? handleUpdateSftp : handleAddSftp}
              disabled={!sftpForm.name || !sftpForm.host || !sftpForm.username}
              data-testid="button-save-sftp"
            >
              {editingSftp ? "Save Changes" : "Add Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
