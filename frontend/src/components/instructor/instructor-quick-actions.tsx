import Link from "next/link";
import { ClipboardList, FilePlus2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QUICK_ACTIONS = [
  { label: "Create Course", href: "/instructor/courses/create", icon: Plus },
  { label: "Create Quiz", href: "/instructor/quizzes/create", icon: FilePlus2 },
  {
    label: "Review Submissions",
    href: "/instructor/submissions",
    icon: ClipboardList,
  },
];

export function InstructorQuickActions() {
  return (
    <Card
      data-component="InstructorQuickActions"
      className="instructor-quick-actions__container_01 rounded-[15px]"
    >
      <CardHeader className="instructor-quick-actions__header_01">
        <CardTitle className="instructor-quick-actions__title_01 font-display text-xl font-bold">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="instructor-quick-actions__actions_01 grid grid-cols-1 gap-3 md:grid-cols-3">
        {QUICK_ACTIONS.map(({ label, href, icon: Icon }, index) => (
          <Button
            key={href}
            asChild
            variant={index === 0 ? "default" : "outline"}
            className="instructor-quick-actions__link_01 w-full gap-2"
          >
            <Link href={href}>
              <Icon
                aria-hidden="true"
                className="instructor-quick-actions__icon_01 h-4 w-4 shrink-0"
              />
              {label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
