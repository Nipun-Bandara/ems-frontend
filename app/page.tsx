import { Features } from "@/app/components/landing/Features";
import { Navigation } from "@/app/components/landing/Navigation";
import { Stat } from "@/app/components/landing/Stat";
import { Testimonial } from "@/app/components/landing/Testimonial";
import { HowItWorks } from "@/app/components/landing/HowItWorks";
import { Footer } from "@/app/components/landing/Footer";

export default function Home() {
  return (
    <div className="">
      <Navigation />
      <div className="flex items-center justify-center flex-col pt-24 sm:pt-24 md:pt-12 lg:pt-28 px-4 sm:px-6 md:px-12 lg:px-12 w-full max-w-7xl mx-auto">
        <h2 className="bg-clip-text text-transparent text-center bg-gradient-to-b from-neutral-900 to-neutral-700 dark:from-neutral-600 dark:to-white text-4xl sm:text-5xl lg:text-7xl mb-4 py-4 sm:py-4 md:py-10 relative z-20 font-bold tracking-tight">
          Manage People, Projects, <br /> and Progress
        </h2>
        <p className="text-sm md:text-lg text-textPrimary text-center mb-8">
          Shiftly is the internal employee management system for Creative
          Software, built to streamline dashboards, projects, timesheets, leave,
          claims, events, and goals in one place.
        </p>
        <Stat />
      </div>
      <Features />
      <Testimonial />
      <HowItWorks />
      <Footer />
    </div>
  );
}
