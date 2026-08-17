import React, { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function MultiSelect({ 
  options = [], 
  selected = [], 
  onChange, 
  placeholder = "Seleccionar...",
  className
}) {
  const [open, setOpen] = useState(false);

  const toggleOption = (value) => {
    const isSelected = selected.some(s => s.toLowerCase() === value.toLowerCase());
    if (isSelected) {
      onChange(selected.filter((item) => item.toLowerCase() !== value.toLowerCase()));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal text-left truncate overflow-hidden h-8", className)}
        >
          <span className="truncate max-w-[150px]">
            {selected.length === 0 
              ? placeholder 
              : selected.join(" / ")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0 bg-[#112240] border-[#233554] text-white">
        <Command className="bg-transparent text-white">
          <CommandInput placeholder="Buscar..." className="h-9 border-none focus:ring-0 text-white" />
          <CommandList className="max-h-60 overflow-y-auto custom-scrollbar">
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.some(s => s.toLowerCase() === option.value.toLowerCase());
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => toggleOption(option.value)}
                    className="cursor-pointer hover:bg-orange-500/20 data-[selected=true]:bg-orange-500/20 text-white"
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                      option.isFactory ? "border-orange-500" : "border-orange-500/50",
                      isSelected
                        ? "bg-orange-500 text-white"
                        : "opacity-50 [&_svg]:invisible"
                    )}>
                      <Check className="h-3 w-3" />
                    </div>
                    <span className={cn(option.isFactory && "text-orange-400 font-bold drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]")}>
                      {option.label}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
