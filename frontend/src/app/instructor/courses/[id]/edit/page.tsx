import { notFound } from "next/navigation";
import { CourseForm } from "@/components/instructor/course-form";
import { MOCK_INSTRUCTOR_COURSES } from "@/lib/mock-instructor-courses";

export default function EditCoursePage({ params }: { params: { id: string } }) {
  const course = MOCK_INSTRUCTOR_COURSES.find((item) => item.id === params.id);
  if (!course) notFound();

  return (
    <CourseForm
      key={course.id}
      mode="edit"
      courseId={course.id}
      initialChapters={course.chapters}
      initialIsPublished={course.isPublished}
      initialValues={{
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        category: course.category,
        level: course.level,
      }}
    />
  );
}
