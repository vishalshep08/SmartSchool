import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function ParentComingSoon() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Construction className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-heading font-bold text-foreground">Coming Soon</h2>
          <p className="text-muted-foreground">
            This feature is under development and will be available soon. Stay tuned!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
