export interface GoToStepOptions {
  skipOnLeaveCurrentStep?: boolean;
  skipOnEnterNextStep?: boolean;
  fallBackToLastIncompleteDependency?: boolean;
}

export interface StepDefinition {
  step: string;
  dependencies?: string[] | (() => string[]);
  completedIf?: () => boolean;
  onEnter?: (machine: StepMachine) => void;
  onLeave?: (machine: StepMachine) => void;
}

export class Step {
  private definition: StepDefinition;

  constructor(definition: StepDefinition) {
    this.definition = definition;
  }

  get name(): string {
    return this.definition.step;
  }

  get dependencies(): string[] {
    const dependencies = typeof this.definition.dependencies === 'function'
      ? this.definition.dependencies()
      : this.definition.dependencies;

    return dependencies || [];
  }

  get completedIf(): () => boolean {
    return this.definition.completedIf || (() => true);
  }

  get onEnter(): (machine: StepMachine) => void {
    return this.definition.onEnter || (() => {});
  }

  get onLeave(): (machine: StepMachine) => void {
    return this.definition.onLeave || (() => {});
  }
}

export default class StepMachine {
  private steps: Step[];
  private previousStepInstance: Step | null = null;
  private currentStepInstance: Step | null = null;
  private nextStepInstance: Step | null = null;

  constructor(stepDefinitions: StepDefinition[]) {
    this.steps = stepDefinitions.map(definition => new Step(definition));
  }

  get previousStep(): string | null {
    return (this.previousStepInstance && this.previousStepInstance.name) || null;
  }

  get nextStep(): string | null {
    return (this.nextStepInstance && this.nextStepInstance.name) || null;
  }

  get currentStep(): string | null {
    return (this.currentStepInstance && this.currentStepInstance.name) || null;
  }

  get completed(): boolean {
    return this.currentStepInstance ? this.currentStepInstance.completedIf() : true;
  }

  goTo(stepName: string, { skipOnLeaveCurrentStep = false, skipOnEnterNextStep = false, fallBackToLastIncompleteDependency = true }: GoToStepOptions = {}): void {
    if (stepName === this.currentStep) return;

    const nextStepInstance = this.stepFor(stepName);
    const dependencySteps = this.dependencyStepsFor(nextStepInstance);

    // if any of the dependencies are incomplete, we'll want to fall back to
    // the last "incomplete" dependency (or bail if the caller has provided the
    // `fallBackToLastIncompleteDependency: false` option)
    for (let i = 0; i < dependencySteps.length; i++) {
      const dependencyStep = dependencySteps[i];
      const completed = dependencyStep.completedIf();
      if (completed) continue;

      if (fallBackToLastIncompleteDependency) {
        this.goTo(dependencyStep.name, {
          skipOnLeaveCurrentStep,
          skipOnEnterNextStep,
          fallBackToLastIncompleteDependency,
        });
      }

      return;
    }

    this.nextStepInstance = nextStepInstance;
    if (this.currentStepInstance && !skipOnLeaveCurrentStep) {
      // if we're leaving a step and `skipOnLeaveCurrentStep: true` hasn't been
      // provided, we should invoke the `onLeave` callback for the current step
      this.currentStepInstance.onLeave(this);
    }

    this.previousStepInstance = this.currentStepInstance;
    this.currentStepInstance = nextStepInstance;
    this.nextStepInstance = null;
    if (!skipOnEnterNextStep) {
      // since we're entering a step and `skipOnEnterNextStep: true` hasn't been
      // provided, we should invoke the `onEnter` callback for the next step
      nextStepInstance.onEnter(this);
    }
  }

  private stepFor(stepName: string): Step {
    const step = this.steps.find(({ name }) => name === stepName);
    if (step) return step;
    
    throw new Error(`No definition provided for step "${stepName}"`);
  }

  private dependencyStepsFor(step: Step, seen = {} as Record<string, boolean>): Step[] {
    return step.dependencies.reduce((memo, stepName) => {
      if (seen[stepName]) return memo;

      seen[stepName] = true;
      const dependencyStep = this.stepFor(stepName);

      const nestedDependencySteps = this.dependencyStepsFor(dependencyStep, seen);
      return [...memo, ...nestedDependencySteps, dependencyStep];
    }, [] as Step[]);
  }
}
