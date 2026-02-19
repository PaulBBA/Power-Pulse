import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function AnalysisPage() {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold" data-testid="text-coming-soon">Coming Soon</h2>
            <p className="text-muted-foreground" data-testid="text-analysis-description">
              Energy analysis tools are currently under development. Check back soon for advanced usage insights and trend analysis.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
