def validate_tc(tc: str) -> bool:
    if not (isinstance(tc, str) and tc.isdigit() and len(tc) == 11):
        return False
    
    if tc[0] == "0":
        return False

    digits = [int(d) for d in tc]

    # Algorithm:
    # 10th digit = ((sum(odd_digits[:9]) * 7 - sum(even_digits[:8])) % 10)
    # 11th digit = (sum(first_10_digits) % 10)
    
    # digits[:9:2] -> 1st, 3rd, 5th, 7th, 9th digits
    # digits[1:8:2] -> 2nd, 4th, 6th, 8th digits
    
    sum_odd = sum(digits[:9:2])
    sum_even = sum(digits[1:8:2])
    
    if ((sum_odd * 7 - sum_even) % 10) != digits[9]:
        return False

    if (sum(digits[:10]) % 10) != digits[10]:
        return False

    return True
