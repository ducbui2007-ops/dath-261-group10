import Link from "next/link";
import { InstructorQuickActions } from "@/components/instructor/instructor-quick-actions";
import { InstructorCourseCard } from "@/components/instructor/instructor-course-card";
import { InstructorGettingStarted } from "@/components/instructor/instructor-getting-started";
import { MOCK_INSTRUCTOR_COURSES } from "@/lib/mock-instructor-courses";

export default function InstructorHomePage() {
  return (
    <div
      data-component="InstructorHome"
      className="instructor-home__container_01 min-h-screen bg-background pb-16"
    >
      <div className="instructor-home__content_01 mx-auto max-w-7xl space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
        <section
          aria-labelledby="instructor-welcome-title"
          className="instructor-home__welcome_01 space-y-2"
        >
          <h1
            id="instructor-welcome-title"
            className="instructor-home__title_01 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Welcome to your Instructor Workspace
          </h1>
          <p className="instructor-home__description_01 text-sm text-muted-foreground">
            Create learning experiences, manage your courses, and support your students.
          </p>
        </section>

        <InstructorQuickActions />

        <section
          aria-labelledby="instructor-courses-title"
          className="instructor-home__courses_01 space-y-6"
        >
          <div className="instructor-home__section-header_01 flex flex-wrap items-baseline gap-3 border-b border-border pb-3">
            <h2
              id="instructor-courses-title"
              className="instructor-home__section-title_01 font-display text-xl font-bold tracking-tight text-foreground"
            >
              Your Courses
            </h2>
            <span className="instructor-home__course-count_01 text-xs text-muted-foreground">
              {MOCK_INSTRUCTOR_COURSES.length} courses
            </span>
            <Link
              href="/instructor/courses"
              className="instructor-home__view-all_01 ml-auto rounded-lg text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              View All Courses
            </Link>
          </div>
          <div className="instructor-home__course-grid_01 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {MOCK_INSTRUCTOR_COURSES.map((course) => (
              <InstructorCourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>

        <InstructorGettingStarted />
      </div>
    </div>
  );
}
