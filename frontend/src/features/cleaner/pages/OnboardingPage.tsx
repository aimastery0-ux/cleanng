import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { profilesApi } from "@/api/profiles";
import Step1BasicInfo from "../onboarding/Step1BasicInfo";
import Step2IdUpload from "../onboarding/Step2IdUpload";
import Step3BioAreas from "../onboarding/Step3BioAreas";
import Step4Rate from "../onboarding/Step4Rate";

const STEPS = [
  { number: 1, label: "Basic info" },
  { number: 2, label: "ID verification" },
  { number: 3, label: "Your services" },
  { number: 4, label: "Set your rate" },
];

export default function CleanerOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const { data: status } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: profilesApi.getOnboardingStatus,
    onSuccess: (data) => {
      if (data.current_step > 4) navigate("/cleaner/dashboard");
      else setCurrentStep(Math.min(data.current_step, 4));
    },
  });

  const next = () => setCurrentStep((s) => Math.min(s + 1, 4));
  const done = () => navigate("/cleaner/dashboard");

  return (
    <div className="min-h-screen bg-bg-alt">
      {/* Header */}
      <div className="bg-white border-b border-border py-4 px-4">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-lg font-extrabold text-orange">Clean</span>
            <span className="text-lg font-extrabold text-black">NG</span>
          </div>
          <span className="text-small text-grey-mid">Step {currentStep} of 4</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b border-border">
        <div className="mx-auto max-w-2xl">
          <div className="flex">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className={`flex-1 py-3 text-center text-caption font-medium transition-colors ${
                  step.number === currentStep
                    ? "border-b-2 border-orange text-orange"
                    : step.number < currentStep
                    ? "border-b-2 border-success text-success"
                    : "text-grey-light"
                }`}
              >
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="mx-auto max-w-2xl px-4 py-10">
        {currentStep === 1 && <Step1BasicInfo onNext={next} />}
        {currentStep === 2 && <Step2IdUpload onNext={next} onBack={() => setCurrentStep(1)} />}
        {currentStep === 3 && <Step3BioAreas onNext={next} onBack={() => setCurrentStep(2)} />}
        {currentStep === 4 && <Step4Rate onDone={done} onBack={() => setCurrentStep(3)} />}
      </div>
    </div>
  );
}
