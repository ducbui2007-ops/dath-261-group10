import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Course } from "@/types/course";

export type InstructorCourseCardData = Pick<
  Course,
  "id" | "title" | "isPublished" | "enrollmentCount"
>;

interface InstructorCourseCardProps {
  course: InstructorCourseCardData;
}

export function InstructorCourseCard({ course }: InstructorCourseCardProps) {
  const isPublished = course.isPublished;

  return (
    <Card
      data-component="InstructorCourseCard"
      className="instructor-course-card__container_01 flex h-full flex-col rounded-[15px] transition-shadow hover:shadow-md"
    >
      <CardHeader className="instructor-course-card__header_01 flex-1 space-y-3 p-4 sm:p-5">
        <Badge
          variant={isPublished ? "secondary" : "outline"}
          className={cn(
            "instructor-course-card__status_01 self-start",
            !isPublished && "text-muted-foreground"
          )}
        >
          {isPublished ? "Published" : "Draft"}
        </Badge>
        <CardTitle className="instructor-course-card__title_01 font-display text-base font-bold leading-snug">
          {course.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="instructor-course-card__content_01 flex items-center gap-2 px-4 pb-4 pt-0 text-xs text-muted-foreground sm:px-5 sm:pb-5">
        <Users
          aria-hidden="true"
          className="instructor-course-card__students-icon_01 h-4 w-4 shrink-0"
        />
        <span className="instructor-course-card__student-count_01">
          {course.enrollmentCount} students
        </span>
      </CardContent>
      <CardFooter className="instructor-course-card__footer_01 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
        <Button asChild className="instructor-course-card__manage_01 w-full gap-2">
          <Link
            href={`/instructor/courses/${course.id}/edit`}
            aria-label={`Manage Course: ${course.title}`}
          >
            Manage Course
            <ArrowRight
              aria-hidden="true"
              className="instructor-course-card__arrow_01 h-4 w-4 shrink-0"
            />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
