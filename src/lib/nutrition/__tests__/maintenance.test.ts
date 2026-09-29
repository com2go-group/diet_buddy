import {
  goalReached,
  maintenanceStepDue,
  nextMaintenanceTarget,
  regainedAboveBand,
} from '../maintenance';

describe('maintenance', () => {
  it('counts the goal as reached from the trend, with a small margin', () => {
    expect(goalReached(70.2, 70)).toBe(true);
    expect(goalReached(70.4, 70)).toBe(false);
    expect(goalReached(null, 70)).toBe(false);
    expect(goalReached(69, null)).toBe(false);
  });

  it('steps calories up by at most 250 kcal towards maintenance', () => {
    expect(nextMaintenanceTarget(1600, 2200)).toBe(1850);
    expect(nextMaintenanceTarget(2050, 2200)).toBe(2200);
    expect(nextMaintenanceTarget(2190, 2200)).toBeNull();
    expect(nextMaintenanceTarget(2400, 2200)).toBeNull();
  });

  it('spaces steps two weeks apart', () => {
    const start = new Date(2026, 8, 1);
    expect(maintenanceStepDue(start, new Date(2026, 8, 14))).toBe(false);
    expect(maintenanceStepDue(start, new Date(2026, 8, 15))).toBe(true);
  });

  it('offers a gentle refocus only well above the kept weight', () => {
    expect(regainedAboveBand(71.9, 70)).toBe(false);
    expect(regainedAboveBand(72.1, 70)).toBe(true);
  });
});
