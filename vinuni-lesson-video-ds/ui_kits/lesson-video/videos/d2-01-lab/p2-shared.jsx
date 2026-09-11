/*
 * Part 2 (câu 07–08) shared layout: Lan → the job goal on one path, the chatbot card off that path.
 * Used only by s07 / s08 so the diagram carries over unchanged between the two câu.
 */
export const LAN = { x: 250, y: 640, r: 62 };
export const GOAL = { x: 1300, y: 550, w: 500, h: 190 };
export const BOT = { x: 640, y: 300, w: 460, h: 150 };
export const PATH = [
  { x: LAN.x + LAN.r + 14, y: GOAL.y + GOAL.h / 2 },
  { x: GOAL.x, y: GOAL.y + GOAL.h / 2 },
];
export const GOAL_LINES = ['NỘP ĐÚNG BÀI · ĐÚNG NƠI', 'TRƯỚC HẠN'];
