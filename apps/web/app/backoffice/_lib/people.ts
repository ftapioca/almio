import { Branch, Employee } from './types';

export function createBranchNameMap(branches: Branch[]) {
  return new Map(branches.map((branch) => [branch.id, `${branch.code} · ${branch.name}`]));
}

export function createEmployeeNameMap(employees: Employee[]) {
  return new Map(
    employees.map((employee) => [
      employee.id,
      `${employee.firstName} ${employee.lastName}`,
    ]),
  );
}

export function filterEmployeesByBranch(employees: Employee[], branchId: string) {
  if (!branchId) {
    return employees;
  }

  return employees.filter((employee) => employee.branchId === branchId);
}

export function filterEmployeesBySearch(employees: Employee[], searchTerm: string) {
  const search = searchTerm.trim().toLowerCase();
  if (!search) {
    return employees;
  }

  return employees.filter((employee) => {
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
    return (
      fullName.includes(search) ||
      employee.email?.toLowerCase().includes(search) ||
      employee.id.toLowerCase().includes(search)
    );
  });
}
