import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GETTING_STARTED_STEPS = [
  "Create a course",
  "Add chapters and lessons",
  "Upload learning materials",
  "Create a quiz",
  "Review submissions",
];

export function InstructorGettingStarted() {
  return (
    <Card
      data-component="InstructorGettingStarted"
      className="instructor-getting-started__container_01 rounded-[15px]"
    >
      <CardHeader className="instructor-getting-started__header_01">
        <CardTitle className="instructor-getting-started__title_01 font-display text-xl font-bold">
          Getting Started
        </CardTitle>
      </CardHeader>
      <CardContent className="instructor-getting-started__content_01">
        <ol className="instructor-getting-started__steps_01 list-inside list-decimal space-y-3 text-sm text-muted-foreground marker:font-semibold marker:text-primary">
          {GETTING_STARTED_STEPS.map((step) => (
            <li key={step} className="instructor-getting-started__step_01">
              {step}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
