export type CodeFlowAnalysisResult = {
  language?: string;
  detectedAlgorithm?: string;
  detectedPattern?: string;
  inputUsed?: string;
  codeSummary?: string;

  review?: {
    bugs: string[];
    qualitySuggestions: string[];
    edgeCaseRisks: string[];
    improvedCode?: string;
    scores?: {
      correctness: number;
      readability: number;
      efficiency: number;
      interviewReadiness: number;
    };
  };

  analysis?: {
    approach: string[];
    timeComplexity: {
      best?: string;
      average?: string;
      worst: string;
      explanation: string;
    };
    spaceComplexity: {
      value: string;
      explanation: string;
    };
    betterApproach?: string;
    interviewExplanation?: string;
  };

  dryRun?: {
    input?: string;
    columns: string[];
    rows: Array<Record<string, string>>;
    variableWatch?: Array<{
      step: number;
      variables: Record<string, string>;
    }>;
    snapshots?: Array<{
      step: number;
      title: string;
      description: string;
      variables?: Record<string, string>;
    }>;
    finalOutput?: string;
    warnings?: string[];
  };

  hiddenTestRisks?: string[];

  testCases?: Array<{
    title: string;
    input: string;
    expectedOutput?: string;
    explanation: string;
    type: "sample" | "edge" | "hidden-risk" | "stress";
  }>;
};
