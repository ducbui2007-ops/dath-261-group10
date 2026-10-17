import Link from "next/link";
import { InstructorCourseCard } from "@/components/instructor/instructor-course-card";
import { Button } from "@/components/ui/button";
import { MOCK_INSTRUCTOR_COURSES } from "@/lib/mock-instructor-courses";

export default function InstructorCoursesPage() {
  return (
    <div
      data-component="InstructorCourseList"
      className="instructor-course-list__container_01 min-h-screen bg-background pb-16"
    >
      <div className="instructor-course-list__content_01 mx-auto max-w-7xl space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
        <div className="instructor-course-list__header_01 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1
            id="instructor-course-list-title"
            className="instructor-course-list__title_01 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Your Courses
          </h1>
          <Button asChild className="instructor-course-list__create_01">
            <Link href="/instructor/courses/create">Create Course</Link>
          </Button>
        </div>
        <section
          aria-labelledby="instructor-course-list-title"
          className="instructor-course-list__grid_01 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {MOCK_INSTRUCTOR_COURSES.map((course) => (
            <InstructorCourseCard key={course.id} course={course} />
          ))}
        </section>
      </div>
    </div>
  );
}
