"""Run with the same Python environment as the asset preparation scripts."""
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image, ImageDraw


with TemporaryDirectory() as temporary:
    root = Path(temporary)
    for script, source_name, output_name in [
        ("prepare-generated.py", "chofis-carrera.jpeg", "chofis-run.png"),
        ("prepare-world.py", "cielo-fonda-v3.jpeg", "cielo-fonda.webp"),
    ]:
        source, output = root/script/"source", root/script/"output"
        source.mkdir(parents=True)
        output.mkdir()
        image = Image.new("RGB", (1280, 320), "white")
        draw = ImageDraw.Draw(image)
        for x in range(80, 1280, 320):
            draw.rectangle((x, 70, x+150, 270), fill="#345789")
        image.save(source/source_name)
        (output/output_name).write_bytes(b"keep previous result")
        result = subprocess.run(
            [sys.executable, str(Path(__file__).with_name(script)), str(source), str(output)],
            capture_output=True, text=True,
        )
        assert result.returncode != 0, "Incomplete input should fail"
        assert (output/output_name).read_bytes() == b"keep previous result", script
        assert len(list(output.iterdir())) == 1, script
    print("Both asset scripts preserve previous results when inputs are missing.")
