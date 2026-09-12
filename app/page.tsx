import { PlanExperience } from '@/components/PlanExperience';

/**
 * 서버 컴포넌트로 유지한다.
 * 클라이언트 JS 는 PlanExperience 부터 시작하며, 이 파일은 번들에 기여하지 않는다.
 */
export default function Page() {
  return <PlanExperience />;
}
