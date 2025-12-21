import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { List, Surface, TextInput, useTheme } from "react-native-paper";
import { shadows } from '../config/theme';

interface AutocompleteInputTextProps {
    label: string;
    placeholder: string;
    value?: string;
    onChangeText: (text: string) => void;
    disabled: boolean;
    suggestions?: string[]
}

const AutocompleteInputText = (prop: AutocompleteInputTextProps) => {

    const theme = useTheme();
    const [value, setValue] = useState(prop.value ?? '');
    const [suggestion, setSuggestion] = useState(prop.value ?? '');

    const handleOnChangeText = (text: string) => {
        setValue(text);
        prop.onChangeText(text);
    }

    const handleOnPressSuggestion = (suggestion: string) => {
        setValue(suggestion)
        setSuggestion(suggestion)
        prop.onChangeText(suggestion)
    }

    const generateSuggestions = () => {
        if (value && suggestion !== value) {
            const filteredSuggestions = prop.suggestions
                ?.filter(suggestion => suggestion.toLowerCase().startsWith(value.toLowerCase()));

            if (filteredSuggestions && filteredSuggestions.length > 0) {
                return (
                    <Surface elevation={0} style={styles.suggestionContainer}>
                        {filteredSuggestions.map(suggestion => (
                            <List.Item
                                key={suggestion}
                                title={suggestion}
                                onPress={() => handleOnPressSuggestion(suggestion)}
                                style={styles.suggestionItem}
                                titleStyle={styles.suggestionText}
                            />
                        ))}
                    </Surface>
                );
            }
        }
        return null;
    }

    return (
        <View>
            <TextInput
                label={prop.label}
                value={value}
                onChangeText={handleOnChangeText}
                placeholder={prop.placeholder}
                disabled={prop.disabled}
                mode="flat"
                style={styles.input}
                underlineStyle={{ display: 'none' }}
                theme={{
                    colors: {
                        primary: theme.colors.primary,
                        onSurfaceVariant: theme.colors.onSurfaceVariant,
                    }
                }}
            />
            {generateSuggestions()}
        </View>
    );
};

const styles = StyleSheet.create({
    input: {
        borderRadius: 12,
        backgroundColor: '#F8F9FA',
        ...shadows.sm,
    },
    suggestionContainer: {
        marginTop: 4,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        maxHeight: 200,
    },
    suggestionItem: {
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    suggestionText: {
        fontSize: 14,
    }
})

export default AutocompleteInputText;