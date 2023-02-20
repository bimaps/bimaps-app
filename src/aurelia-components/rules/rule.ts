import { RuleIOType, RuleIORef } from './interfaces';
import { Process } from './process';

export class Rule {
 
  /**
   * Each rule must have a unique type
   */
  public type: string;

  /**
   * Name of the rule
   */
  public name: string;

  /**
   * List of input types that can be used as input for this rule
   */
  public allowedInputTypes: RuleIOType[] = [];

  /**
   * If true, will throw if the input provided is invalid while running the process.
   * If false, the rule will be ignored
   */
  public throwIfInvalidInput = false;
  
  /**
   * Describe the type that this rule will generate as output
   */
  public outputType: RuleIOType;

  /**
   * Value generated as output from this rule
   */
  public outputValue: any = undefined;

  /**
   * Objects or references that are concerned by the the output of this rule
   */
  public outputReference: RuleIORef | RuleIORef[];

  /**
   * Text describing the output in short terms. Can be used in a preview of the process
   */
  public outputSummary?: string;

  /**
   * Name of the process variable that must be used as input
   */
  public inputVarName?: string;

  /**
   * Name of the process variable that will hold the output value
   */
  public outputVarName: string;

  protected currentInput: any;
  protected currentInputType: RuleIOType;
  protected currentInputRef: RuleIORef | RuleIORef[];
  protected currentProcess: Process;

  public async runProcessRule(process: Process, input: any, inputType: RuleIOType, inputRef: RuleIORef | RuleIORef[]): Promise<void> {
    this.currentProcess = process;
    if (!this.inputVarName) {
      throw new Error('Missing inputVarName');
    }
    if (!inputType) {
      throw new Error('Input requested not found');
    }
    if (!this.allowedInputTypes.includes(inputType) && this.throwIfInvalidInput) {
      if (this.throwIfInvalidInput) {
        throw new Error('Invalid input type');
      } else {
        return;
      }
    }
    this.currentInput = input;
    this.currentInputType = inputType;
    this.currentInputRef = inputRef;

    await this.processRule();
  }

  public async processRule(): Promise<void> {

  }

  public async summary(): Promise<void> {
    this.outputSummary = '';
  }

}
