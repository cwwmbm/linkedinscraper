import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  company: string;

  @Column({ type: 'text', nullable: true })
  location: string;

  @Column({ type: 'text', nullable: true })
  date: string;

  @Column({ type: 'text', nullable: true })
  job_url: string;

  @Column({ type: 'text', nullable: true })
  job_description: string;

  @Column({ type: 'integer', default: 0 })
  applied: number;

  @Column({ type: 'integer', default: 0 })
  hidden: number;

  @Column({ type: 'integer', default: 0 })
  interview: number;

  @Column({ type: 'integer', default: 0 })
  rejected: number;

  @Column({ type: 'integer', default: 0 })
  blocked: number;

  @Column({ type: 'text', nullable: true })
  date_loaded: string;

  @Column({ type: 'text', nullable: true })
  cover_letter: string;

  @Column({ type: 'text', nullable: true })
  resume: string;

  @Column({ type: 'text', nullable: true })
  metadata: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
