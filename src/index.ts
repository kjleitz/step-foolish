export interface GoToStepOptions {
  immediate: boolean;
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
  public enteredWithOptions: GoToStepOptions = { immediate: false };
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

  // TODO: go to the last "completed" step in the dependency list if they're not
  //       all satisfied.
  // TODO: do nothing if the `stepName` is the same as `this.currentStep`
  goTo(stepName: string, options: Partial<GoToStepOptions> = {}): void {
    const nextStepInstance = this.stepFor(stepName);
    const dependencySteps = this.dependencyStepsFor(nextStepInstance);
    const dependenciesSatisfied = dependencySteps.every(step => step.completedIf());
    if (!dependenciesSatisfied) return;
    
    this.nextStepInstance = nextStepInstance;
    if (this.currentStepInstance && !options.immediate) {
      this.currentStepInstance.onLeave(this);
    }

    this.previousStepInstance = this.currentStepInstance;
    this.currentStepInstance = nextStepInstance;
    this.nextStepInstance = null;
    this.enteredWithOptions = { immediate: !!options.immediate };
    nextStepInstance.onEnter(this);
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
      return [...memo, dependencyStep, ...nestedDependencySteps];
    }, [] as Step[]);
  }
}

// let tosAccepted = false;
// let requireDate = false;
// let dateSelected = false;
// let timeSelected = false;
// const showTos = () => console.log('showTos');
// const hideTos = () => console.log('hideTos');
// const popModal = str => console.log('popModal:', str);
// const initDateSelect = () => console.log('initDateSelect');
// const tearDownDateSelect = () => console.log('tearDownDateSelect');
// const initTimeSelect = () => console.log('initTimeSelect');
// const tearDownTimeSelect = () => console.log('tearDownTimeSelect');

// const machine = new StepMachine([
//   {
//     step: 'termsOfService',

//     completedIf: () => {
//       return tosAccepted;
//     },

//     onEnter: (machine) => {
//       showTos();
//     },

//     onLeave: (machine) => {
//       hideTos();
//     },
//   },
//   {
//     step: 'rejectedTermsOfService',

//     onEnter: (machine) => {
//       popModal("You must accept the terms of service to continue");
//     },
//   },
//   {
//     step: 'date',

//     dependencies: [
//       'termsOfService',
//     ],

//     completedIf: () => {
//       return dateSelected;
//     },

//     onEnter: (machine) => {
//       if (machine.completed) {
//         machine.goTo('time', { immediate: true });
//       } else {
//         initDateSelect();
//       }
//     },

//     onLeave: (machine) => {
//       tearDownDateSelect();
//     },
//   },
//   {
//     step: 'time',

//     dependencies: () => {
//       return requireDate ? ['termsOfService', 'date'] : ['date'];
//     },

//     completedIf: () => {
//       return timeSelected;
//     },

//     onEnter: (machine) => {
//       if (machine.completed) {
//         machine.goTo('finished', { immediate: true });
//       } else {
//         initTimeSelect();
//       }
//     },

//     onLeave: (machine) => {
//       tearDownTimeSelect();
//     },
//   },
//   {
//     step: 'finished',

//     dependencies: [
//       'termsOfService',
//       'date',
//       'time',
//     ],

//     onEnter: (machine) => {
//       popModal("You're finished!");
//     },
//   },
// ]);
