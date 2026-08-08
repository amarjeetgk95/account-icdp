import { employeeRepository } from '../repositories/employee.repository';
import type { EmployeeInput } from '../validation/employee.schema';
import type { Database } from '@/shared/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];

export class EmployeeService {
  async listEmployees(): Promise<Employee[]> {
    return employeeRepository.list();
  }

  async addEmployee(input: EmployeeInput): Promise<Employee> {
    this.validateInput(input);
    return employeeRepository.create(input);
  }

  async updateEmployee(input: EmployeeInput): Promise<Employee> {
    this.validateInput(input);
    if (!input.id) {
      throw new Error('Employee ID is required for update');
    }
    return employeeRepository.update(input);
  }

  async deleteEmployee(id: string, pan: string): Promise<void> {
    if (!id) throw new Error('Employee ID is required');
    if (!pan) throw new Error('PAN is required for verification');

    const employee = await employeeRepository.getById(id);
    if (!employee) {
      throw new Error('Employee record not found');
    }

    if (employee.pan.toUpperCase() !== pan.toUpperCase()) {
      throw new Error('PAN verification failed. Record may have been modified.');
    }

    await employeeRepository.delete(id);
  }

  private validateInput(input: EmployeeInput): void {
    if (!input.name || input.name.trim().length < 2) {
      throw new Error('Employee name must be at least 2 characters');
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(input.pan)) {
      throw new Error('Invalid PAN format. Must be 10 characters (e.g., ABCDE1234F)');
    }
  }
}

export const employeeService = new EmployeeService();
