// app/admin/relationships/RelationshipForm.tsx

import type {
  CharacterOption,
  RelationshipFormValues,
} from "@/lib/admin/relationships";

type RelationshipFormProps = {
  values: RelationshipFormValues;
  characters: CharacterOption[];
  submitLabel: string;
  action: (formData: FormData) => void | Promise<void>;
};

function FieldLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <label className="mb-1 block text-sm font-medium text-[#2a313d]">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
    />
  );
}

export default function RelationshipForm({
  values,
  characters,
  submitLabel,
  action,
}: RelationshipFormProps) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel>Source Character</FieldLabel>
          <Select
            name="sourceCharacterId"
            defaultValue={values.sourceCharacterId}
            required
          >
            <option value="">Select character</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name} ({character.key})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <FieldLabel>Target Character</FieldLabel>
          <Select
            name="targetCharacterId"
            defaultValue={values.targetCharacterId}
            required
          >
            <option value="">Select character</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name} ({character.key})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <FieldLabel>Relationship Label</FieldLabel>
        <Input
          name="relationshipLabel"
          defaultValue={values.relationshipLabel}
          placeholder="ally, rival, acquaintance, superior, subordinate..."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <FieldLabel>Affinity</FieldLabel>
          <Input
            name="affinity"
            type="number"
            defaultValue={values.affinity}
            min={-100}
            max={100}
          />
        </div>

        <div>
          <FieldLabel>Trust</FieldLabel>
          <Input
            name="trust"
            type="number"
            defaultValue={values.trust}
            min={-100}
            max={100}
          />
        </div>

        <div>
          <FieldLabel>Familiarity</FieldLabel>
          <Input
            name="familiarity"
            type="number"
            defaultValue={values.familiarity}
            min={-100}
            max={100}
          />
        </div>
      </div>

      <div>
        <FieldLabel>Notes</FieldLabel>
        <Textarea
          name="notes"
          defaultValue={values.notes}
          rows={8}
          placeholder="History, shared events, hidden tensions, public impression, unspoken dynamics..."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-xl bg-[#2a313d] px-5 py-3 font-semibold text-white"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}