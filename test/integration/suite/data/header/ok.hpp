// THIS IS A TEST TOO
// BLUBB
#pragma once

#include "IShape.h"

namespace test {

class ok : public IShape {
ok ();
~ok () override;
public:
	void move_x (distance x) override;
	// void move_y (distance y) override;
	void rotate (angle rotation) override;
};}