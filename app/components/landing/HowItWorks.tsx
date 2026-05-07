export const HowItWorks = () => {
  const steps = [
    {
      number: "1",
      title: "Sign In & Start the Day",
      description:
        "Access your personalized dashboard to review goals, to-dos, highlights, and team updates.",
    },
    {
      number: "2",
      title: "Manage Workflows",
      description:
        "Handle timesheets, leave requests, claims, letters, and employee profile updates in one place.",
    },
    {
      number: "3",
      title: "Collaborate & Grow",
      description:
        "Contribute to projects, join events, refer talent, and earn star points as you hit milestones.",
    },
  ];

  return (
    <div className="pt-4 lg:pt-12 px-4 sm:px-6 md:px-12 lg:px-12 w-full max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-textPrimary mb-4">
          How Shiftly Works
        </h2>
        <p className="text-xl text-textSecondary">
          A simple internal flow for managing your day at Creative Software
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="relative"
            style={{ zIndex: steps.length - idx }}
          >
            <div className="bg-backgroundSecondary p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-borderPrimary">
              <div className="w-16 h-16 bg-hoverPrimary rounded-full flex items-center justify-center text-textPrimary text-2xl font-bold mb-6 ">
                {step.number}
              </div>
              <h3 className="text-2xl font-bold text-textPrimary mb-3">
                {step.title}
              </h3>
              <p className="text-textSecondary">{step.description}</p>
            </div>
            {idx < steps.length - 1 && (
              <div className="hidden md:block absolute top-[62px] left-24 -right-8 h-1 bg-primary" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
