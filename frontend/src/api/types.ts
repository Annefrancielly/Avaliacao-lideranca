export interface Employee {
  id: number;
  name: string;
  email: string;
  position_name: string;
}

export interface Question {
  id: number;
  title: string;
  weight: number;
}

export interface LastEvaluation {
  id: number;
  final_score: number;
  created_at: string;
  evaluator_name: string;
}

export interface TeamMember extends Employee {
  depth: number;
  is_direct: boolean;
  direct_leaders: string | null;
  last_evaluation: LastEvaluation | null;
  evaluated_by_me_this_week: boolean;
}

export interface AnswerInput {
  question_id: number;
  score: number;
}

export interface EvaluationInput {
  evaluated_id: number;
  answers: AnswerInput[];
}

export interface EvaluationAnswer {
  question_id: number;
  title: string;
  weight: number;
  score: number;
}

export interface Evaluation {
  id: number;
  evaluator_id: number;
  evaluator_name: string;
  evaluated_id: number;
  final_score: number;
  week_start: string;
  created_at: string;
  answers: EvaluationAnswer[];
}
