import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

interface HelpStep {
  title: string;
  body: string;
}

interface HelpAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'outline';
  fullWidth?: boolean;
}

interface HelpBadge {
  label: string;
  value: string | number;
  variant?: 'secondary' | 'outline';
}

interface HelpHowToGuide {
  title: string;
  steps: string[];
}

interface InteractiveModuleHelpProps {
  moduleKey: string;
  userId: string;
  title: string;
  description: string;
  moduleIcon: LucideIcon;
  triggerLabel?: string;
  steps: HelpStep[];
  actions: HelpAction[];
  badges?: HelpBadge[];
  howToGuides?: HelpHowToGuide[];
}

export function InteractiveModuleHelp({
  moduleKey,
  userId,
  title,
  description,
  moduleIcon: ModuleIcon,
  triggerLabel = 'Module Help',
  steps,
  actions,
  badges = [],
  howToGuides = [],
}: InteractiveModuleHelpProps) {
  const helpOnboardingVersion = 'v1';
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const stepStorageKey = useMemo(
    () => `prospaces.${moduleKey}.help.step.${userId}`,
    [moduleKey, userId]
  );
  const seenStorageKey = useMemo(
    () => `prospaces.${moduleKey}.help.seen.${helpOnboardingVersion}.${userId}`,
    [moduleKey, userId]
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      localStorage.setItem(seenStorageKey, 'true');
    }
  };

  const runAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  useEffect(() => {
    const savedStep = localStorage.getItem(stepStorageKey);
    if (savedStep !== null) {
      const parsed = Number(savedStep);
      if (!Number.isNaN(parsed)) {
        setActiveStep(Math.max(0, Math.min(parsed, steps.length - 1)));
      }
    }

    const hasSeenHelp = localStorage.getItem(seenStorageKey) === 'true';
    if (!hasSeenHelp) {
      const frame = window.requestAnimationFrame(() => {
        setIsOpen(true);
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }
  }, [seenStorageKey, stepStorageKey, steps.length]);

  useEffect(() => {
    localStorage.setItem(stepStorageKey, String(activeStep));
  }, [activeStep, stepStorageKey]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        title={triggerLabel}
        className="flex shrink-0 items-center gap-2 px-2 sm:px-3"
      >
        <BookOpen className="h-4 w-4" />
        <span className="hidden sm:inline">{triggerLabel}</span>
        <span className="sm:hidden">Help</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[calc(100vw-0.75rem)] max-w-[1200px] max-h-[92dvh] overflow-y-auto p-4 sm:w-[98vw] sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ModuleIcon className="h-5 w-5 text-sky-600" />
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Guided Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {steps.map((step, index) => (
                  <button
                    key={step.title}
                    onClick={() => setActiveStep(index)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      activeStep === index
                        ? 'border-sky-300 bg-sky-50 text-sky-900'
                        : 'border-border bg-background hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{step.title}</span>
                      {activeStep === index && <CheckCircle2 className="h-4 w-4 text-sky-600" />}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{steps[activeStep]?.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{steps[activeStep]?.body}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {badges.map((badge) => (
                      <Badge key={`${badge.label}-${badge.value}`} variant={badge.variant || 'secondary'}>
                        {badge.label}: {badge.value}
                      </Badge>
                    ))}
                    <Badge variant="outline">Step {activeStep + 1} of {steps.length}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Try These Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                  {actions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <Button
                        key={action.label}
                        variant={action.variant || 'outline'}
                        className={`justify-start min-w-0 whitespace-normal text-left ${action.fullWidth ? 'xl:col-span-2' : ''}`}
                        onClick={() => runAction(action.onClick)}
                      >
                        <ActionIcon className="mr-2 h-4 w-4" />
                        {action.label}
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>

              {howToGuides.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">How To</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {howToGuides.map((guide) => (
                      <div key={guide.title} className="rounded-lg border border-border bg-background p-3">
                        <h4 className="text-sm font-semibold text-foreground">{guide.title}</h4>
                        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                          {guide.steps.map((step) => (
                            <li key={`${guide.title}-${step}`}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
