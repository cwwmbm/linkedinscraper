<script>
	import { createEventDispatcher } from 'svelte';

	export let show = false;

	const dispatch = createEventDispatcher();

	let title = '';
	let company = '';
	let location = '';
	let job_description = '';
	let isSubmitting = false;
	let errorMessage = '';

	function closeModal() {
		// Reset form
		title = '';
		company = '';
		location = '';
		job_description = '';
		errorMessage = '';
		dispatch('close');
	}

	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	}

	async function handleSubmit() {
		// Validate job description is not empty
		if (!job_description.trim()) {
			errorMessage = 'Job description is required';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/add_manual_job', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					title: title.trim() || undefined,
					company: company.trim() || undefined,
					location: location.trim() || undefined,
					job_description: job_description.trim(),
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Error: ${response.status}`);
			}

			const result = await response.json();

			// Dispatch success event with the created job
			dispatch('jobAdded', result.job);

			// Close modal
			closeModal();
		} catch (error) {
			errorMessage = `Failed to add job: ${error.message}`;
			console.error('Error adding job:', error);
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if show}
	<div class="modal-backdrop" on:click={handleBackdropClick}>
		<div class="modal-content">
			<div class="modal-header">
				<h2>Add New Job</h2>
				<button class="close-btn" on:click={closeModal} disabled={isSubmitting}>✕</button>
			</div>

			<form on:submit|preventDefault={handleSubmit}>
				<div class="form-group">
					<label for="title">
						Job Title
						<span class="optional">(optional)</span>
					</label>
					<input
						id="title"
						type="text"
						bind:value={title}
						placeholder="e.g., Senior Backend Developer"
						disabled={isSubmitting}
					/>
				</div>

				<div class="form-group">
					<label for="company">
						Company
						<span class="optional">(optional)</span>
					</label>
					<input
						id="company"
						type="text"
						bind:value={company}
						placeholder="e.g., Acme Inc."
						disabled={isSubmitting}
					/>
				</div>

				<div class="form-group">
					<label for="location">
						Location
						<span class="optional">(optional)</span>
					</label>
					<input
						id="location"
						type="text"
						bind:value={location}
						placeholder="e.g., Remote, New York, USA"
						disabled={isSubmitting}
					/>
				</div>

				<div class="form-group">
					<label for="job_description">
						Job Description
						<span class="required">*</span>
					</label>
					<textarea
						id="job_description"
						bind:value={job_description}
						placeholder="Paste the job description here..."
						rows="10"
						required
						disabled={isSubmitting}
					></textarea>
					<p class="help-text">
						AI will extract missing information from the description
					</p>
				</div>

				{#if errorMessage}
					<div class="error-message">
						{errorMessage}
					</div>
				{/if}

				<div class="modal-actions">
					<button
						type="button"
						class="btn btn-secondary"
						on:click={closeModal}
						disabled={isSubmitting}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn btn-primary"
						disabled={isSubmitting || !job_description.trim()}
					>
						{isSubmitting ? 'Adding...' : 'Add Job'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background-color: white;
		border-radius: 8px;
		width: 100%;
		max-width: 600px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e1e5e9;
	}

	.modal-header h2 {
		margin: 0;
		color: #0a66c2;
		font-size: 1.5rem;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #666;
		cursor: pointer;
		padding: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.close-btn:hover:not(:disabled) {
		background-color: #f0f0f0;
	}

	.close-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	form {
		padding: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
		font-size: 0.9rem;
	}

	.optional {
		color: #999;
		font-weight: normal;
		font-size: 0.85rem;
	}

	.required {
		color: #dc3545;
		font-weight: bold;
	}

	input,
	textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.9rem;
		font-family: inherit;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	input:focus,
	textarea:focus {
		outline: none;
		border-color: #0a66c2;
		box-shadow: 0 0 0 2px rgba(10, 102, 194, 0.1);
	}

	input:disabled,
	textarea:disabled {
		background-color: #f5f5f5;
		cursor: not-allowed;
	}

	textarea {
		resize: vertical;
		min-height: 200px;
		line-height: 1.5;
	}

	.help-text {
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: #666;
		font-style: italic;
	}

	.error-message {
		padding: 0.75rem;
		background-color: #f8d7da;
		border: 1px solid #f5c6cb;
		border-radius: 4px;
		color: #721c24;
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e1e5e9;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		background-color: #6c757d;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #5a6268;
	}

	.btn-primary {
		background-color: #0a66c2;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #004182;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.modal-backdrop {
			padding: 0;
		}

		.modal-content {
			max-width: 100%;
			max-height: 100vh;
			height: 100vh;
			border-radius: 0;
		}

		.modal-header {
			padding: 1rem;
		}

		.modal-header h2 {
			font-size: 1.25rem;
		}

		form {
			padding: 1rem;
		}

		.form-group {
			margin-bottom: 1rem;
		}

		textarea {
			min-height: 150px;
		}

		.modal-actions {
			flex-direction: column-reverse;
		}

		.btn {
			width: 100%;
		}
	}
</style>
