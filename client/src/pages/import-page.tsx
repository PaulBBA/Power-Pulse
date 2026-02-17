import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CloudUpload, FileText, Upload, CheckCircle, AlertCircle, Clock, Loader2, X } from "lucide-react";
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

export default function ImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: importLogs, refetch: refetchLogs } = useQuery<ImportLogEntry[]>({
    queryKey: ["/api/import/logs"],
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

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Data Import</h1>
        <p className="text-muted-foreground">Upload half-hourly profile data from CSV files.</p>
      </div>

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
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Import History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {importLogs && importLogs.length > 0 ? (
                <div className="space-y-3">
                  {importLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border rounded-md" data-testid={`row-import-log-${log.id}`}>
                      <div className="mt-0.5">
                        {log.status === "completed" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : log.status === "completed_with_errors" ? (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        ) : log.status === "processing" ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{log.filename}</p>
                        <p className="text-xs text-muted-foreground">{log.format}</p>
                        <div className="flex gap-2 mt-1">
                          {log.importedRows !== null && log.importedRows > 0 && (
                            <span className="text-xs text-green-600">{log.importedRows} imported</span>
                          )}
                          {log.skippedRows !== null && log.skippedRows > 0 && (
                            <span className="text-xs text-muted-foreground">{log.skippedRows} skipped</span>
                          )}
                          {log.errorRows !== null && log.errorRows > 0 && (
                            <span className="text-xs text-red-500">{log.errorRows} errors</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No imports yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
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
    </Layout>
  );
}
